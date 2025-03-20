import { db } from '../db';
import { sql } from 'drizzle-orm';

interface NotificationData {
  userId: number;
  appointmentId: number;
  title: string;
  message: string;
  type: string;
}

class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: NotificationData) {
    console.log('Creating notification with data:', data);
    
    try {
      const result = await db.execute(sql`
        INSERT INTO notifications (user_id, appointment_id, title, message, type)
        VALUES (${data.userId}, ${data.appointmentId}, ${data.title}, ${data.message}, ${data.type})
        RETURNING *
      `);
      
      console.log('Notification created successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification in database:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: number) {
    const result = await db.execute(sql`
      SELECT * FROM notifications
      WHERE user_id = ${userId} AND is_read = false
      ORDER BY created_at DESC
    `);
    
    return result.rows;
  }

  /**
   * Get all notifications for a user (with optional limit and offset)
   */
  async getAllNotifications(userId: number, limit = 50, offset = 0) {
    const result = await db.execute(sql`
      SELECT * FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    return result.rows;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number) {
    const result = await db.execute(sql`
      UPDATE notifications
      SET is_read = true
      WHERE id = ${notificationId}
      RETURNING *
    `);
    
    return result.rows[0];
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number) {
    await db.execute(sql`
      UPDATE notifications
      SET is_read = true
      WHERE user_id = ${userId} AND is_read = false
    `);
    
    return { success: true };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number) {
    await db.execute(sql`
      DELETE FROM notifications
      WHERE id = ${notificationId}
    `);
    
    return { success: true };
  }

  /**
   * Generate a status change notification
   */
  async generateStatusNotification(appointment: any, status: string, notes?: string) {
    // Skip notification for walk-in appointments (no patientId)
    if (!appointment.patientId) {
      console.log('Skipping notification for walk-in appointment:', appointment.id);
      return null;
    }
    
    // Get user and doctor information
    const [doctorResult, patientResult] = await Promise.all([
      db.execute(sql`SELECT * FROM users WHERE id = ${appointment.doctorId}`),
      db.execute(sql`SELECT * FROM users WHERE id = ${appointment.patientId}`)
    ]);
    
    const doctor = doctorResult.rows[0];
    const patient = patientResult.rows[0];
    
    if (!doctor || !patient) {
      throw new Error('Doctor or patient not found');
    }
    
    let title, message;
    
    switch (status) {
      case "start":
        title = "Your appointment has started";
        message = `Your consultation with Dr. ${doctor.name} has begun. Please proceed to the doctor's room.`;
        break;
      case "hold":
        title = "Your appointment is on hold";
        message = `Your appointment with Dr. ${doctor.name} has been placed on hold${notes ? `: ${notes}` : '.'}`;
        break;
      case "pause":
        title = "Your appointment has been paused";
        message = `Your appointment with Dr. ${doctor.name} has been paused${notes ? `: ${notes}` : '.'}`;
        break;
      case "cancel":
        title = "Your appointment has been cancelled";
        message = `Your appointment with Dr. ${doctor.name} has been cancelled${notes ? `: ${notes}` : '.'}`;
        break;
      case "completed":
        title = "Your appointment is complete";
        message = `Your consultation with Dr. ${doctor.name} has been completed.`;
        break;
      default:
        return null; // Don't notify for other status changes
    }
    
    return this.createNotification({
      userId: appointment.patientId,
      appointmentId: appointment.id,
      title,
      message,
      type: `status_${status}`
    });
  }

  /**
   * Notify patients who are next in line
   */
  async notifyNextPatients(currentAppointment: any) {
    // Get all appointments for the same doctor, clinic, and date
    const result = await db.execute(sql`
      SELECT a.*, u.name AS patient_name, d.name AS doctor_name
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      JOIN users d ON a.doctor_id = d.id
      WHERE a.doctor_id = ${currentAppointment.doctorId}
      AND a.clinic_id = ${currentAppointment.clinicId}
      AND DATE(a.date) = DATE(${new Date(currentAppointment.date).toISOString()})
      AND a.status = 'scheduled'
      AND a.patient_id IS NOT NULL
      ORDER BY a.token_number ASC
    `);
    
    const scheduledAppointments = result.rows;
    
    if (scheduledAppointments.length === 0) {
      return;
    }
    
    // Notify the next patient if available
    const nextAppointment = scheduledAppointments[0];
    
    await this.createNotification({
      userId: Number(nextAppointment.patient_id),
      appointmentId: Number(nextAppointment.id),
      title: "You're next in line",
      message: `You'll be seeing Dr. ${nextAppointment.doctor_name} shortly. Please be ready.`,
      type: "next_in_line"
    });
    
    // Also notify the patient after that (if any)
    if (scheduledAppointments.length > 1) {
      const upcomingAppointment = scheduledAppointments[1];
      
      await this.createNotification({
        userId: Number(upcomingAppointment.patient_id),
        appointmentId: Number(upcomingAppointment.id),
        title: "Your appointment is coming up",
        message: `You are second in line to see Dr. ${upcomingAppointment.doctor_name}. Please remain in the waiting area.`,
        type: "upcoming"
      });
    }
  }

  /**
   * Notify patients when their doctor arrives
   */
  async notifyDoctorArrival(doctorId: number, clinicId: number, date: Date, scheduleId: number | null = null) {
    console.log('Starting notifyDoctorArrival process', { doctorId, clinicId, scheduleId, date: date.toISOString() });
    
    // If no scheduleId is provided, don't send any notifications
    if (!scheduleId) {
      console.log('No specific schedule provided, skipping notifications');
      return;
    }
    
    // Get the doctor name
    const doctorResult = await db.execute(sql`
      SELECT name FROM users WHERE id = ${doctorId} AND role = 'doctor'
    `);
    
    console.log('Doctor query result:', doctorResult.rows);
    
    if (doctorResult.rows.length === 0) {
      console.error('Doctor not found in database, aborting notification');
      throw new Error('Doctor not found');
    }
    
    const doctorName = doctorResult.rows[0].name;
    console.log(`Found doctor: ${doctorName}`);
    
    // Get all scheduled appointments for this doctor/clinic/date/schedule
    console.log(`Querying for patient appointments for schedule: ${scheduleId}`);
    
    const query = sql`
      SELECT a.*, u.name as patient_name
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      WHERE a.doctor_id = ${doctorId}
      AND a.clinic_id = ${clinicId}
      AND DATE(a.date) = DATE(${date.toISOString()})
      AND a.schedule_id = ${scheduleId}
      AND a.status = 'scheduled'
      AND a.patient_id IS NOT NULL
      ORDER BY a.token_number ASC
    `;
    
    const appointmentsResult = await db.execute(query);
    
    const appointments = appointmentsResult.rows;
    console.log(`Found ${appointments.length} appointments to notify:`, appointments);
    
    if (appointments.length === 0) {
      console.log('No appointments to notify, exiting notification process');
      return; // No appointments to notify
    }
    
    console.log(`Sending notifications to ${appointments.length} patients for doctor arrival`);
    
    // Create notifications for all patients
    for (const appointment of appointments) {
      console.log(`Creating notification for patient ${appointment.patient_id} (${appointment.patient_name})`);
      try {
        const notification = await this.createNotification({
          userId: Number(appointment.patient_id),
          appointmentId: Number(appointment.id),
          title: "Your doctor has arrived",
          message: `Dr. ${doctorName} has arrived at the clinic. Your appointment will proceed as scheduled.`,
          type: "doctor_arrival"
        });
        console.log('Successfully created notification:', notification);
      } catch (error) {
        console.error(`Failed to create notification for patient ${appointment.patient_id}:`, error);
      }
    }
    console.log('Doctor arrival notification process completed');
  }
}

export const notificationService = new NotificationService();
