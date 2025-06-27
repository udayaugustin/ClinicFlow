import { db } from "../db";
import { appointments, doctorSchedules } from "@shared/schema";
import { eq, and, lt, gte, desc, asc, ne, isNull, not, or } from "drizzle-orm";
import { format, parse, addMinutes, differenceInMinutes, setHours, setMinutes } from "date-fns";

export interface ETACalculationResult {
  appointmentId: number;
  tokenNumber: number;
  estimatedStartTime: Date;
  currentConsultingToken: number;
  avgConsultationTime: number;
}

export class ETAService {
  private static DEFAULT_CONSULTATION_TIME = 15; // Default 15 minutes per consultation

  /**
   * Calculate initial ETA for a new appointment booking
   * Formula: ETA = scheduleStartTime + (tokenNumber - 1) * avgConsultTime
   */
  static async calculateInitialETA(
    scheduleId: number,
    tokenNumber: number,
    scheduleDate: Date
  ): Promise<Date> {
    // Get schedule details
    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId))
      .limit(1);

    if (!schedule.length) {
      throw new Error("Schedule not found");
    }

    const { startTime, averageConsultationTime } = schedule[0];
    const avgTime = averageConsultationTime || this.DEFAULT_CONSULTATION_TIME;
    
    // Parse schedule start time
    const [hours, minutes] = startTime.split(':').map(Number);
    const baseTime = new Date(scheduleDate);
    baseTime.setHours(hours, minutes, 0, 0);
    
    // Calculate ETA: scheduleStartTime + (tokenNumber - 1) * avgConsultTime
    const estimatedMinutes = (tokenNumber - 1) * avgTime;
    return addMinutes(baseTime, estimatedMinutes);
  }

  /**
   * Update ETA when doctor arrives
   * Formula: ETA = doctorArrivalTime + ((tokenNumber - 1) * avgConsultTime)
   */
  static async updateETAOnDoctorArrival(
    scheduleId: number,
    actualArrivalTime: Date
  ): Promise<void> {
    // Update schedule with actual arrival time
    await db
      .update(doctorSchedules)
      .set({ actualArrivalTime })
      .where(eq(doctorSchedules.id, scheduleId));

    // Get schedule details
    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId))
      .limit(1);

    if (!schedule.length) return;

    const { averageConsultationTime } = schedule[0];
    const avgTime = averageConsultationTime || this.DEFAULT_CONSULTATION_TIME;

    // Get all pending appointments for this schedule
    const pendingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "scheduled")
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    // Update ETA for each pending appointment
    for (const appointment of pendingAppointments) {
      // ETA = doctorArrivalTime + ((tokenNumber - 1) * avgConsultTime)
      const estimatedMinutes = (appointment.tokenNumber - 1) * avgTime;
      const newETA = addMinutes(actualArrivalTime, estimatedMinutes);
      
      await db
        .update(appointments)
        .set({ estimatedStartTime: newETA })
        .where(eq(appointments.id, appointment.id));
    }
  }

  /**
   * Update ETA based on real consultation times after marking appointment as started
   * Also updates ETAs for remaining appointments based on current progress
   */
  static async updateETAOnAppointmentStart(
    appointmentId: number
  ): Promise<void> {
    // Get the appointment details first
    const appointment = await db
      .select({
        scheduleId: appointments.scheduleId,
        tokenNumber: appointments.tokenNumber,
        actualStartTime: appointments.actualStartTime
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointment.length) {
      throw new Error("Appointment not found");
    }

    const { scheduleId, tokenNumber } = appointment[0];

    // Check if there are previous appointments that should be completed
    const previousIncompleteAppointments = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        status: appointments.status
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          lt(appointments.tokenNumber, tokenNumber),
          or(
            eq(appointments.status, "scheduled"),
            eq(appointments.status, "start")
          )
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    // Mark previous appointments as completed if they're not already
    const now = new Date();
    for (const prevAppt of previousIncompleteAppointments) {
      console.log(`⚠️ Auto-completing previous appointment Token ${prevAppt.tokenNumber} before starting Token ${tokenNumber}`);
      
      // Estimate times for the previous appointment
      const estimatedDuration = 15; // Default 15 minutes
      const estimatedStartTime = new Date(now.getTime() - (previousIncompleteAppointments.length * estimatedDuration * 60 * 1000));
      const estimatedEndTime = new Date(estimatedStartTime.getTime() + estimatedDuration * 60 * 1000);
      
      await db
        .update(appointments)
        .set({ 
          status: "completed",
          actualStartTime: estimatedStartTime,
          actualEndTime: estimatedEndTime,
          statusNotes: "Auto-completed when next appointment started"
        })
        .where(eq(appointments.id, prevAppt.id));
    }

    // Update actual start time for the current appointment (if not already set by storage.updateAppointmentStatus)
    if (!appointment[0].actualStartTime) {
      await db
        .update(appointments)
        .set({ actualStartTime: now })
        .where(eq(appointments.id, appointmentId));
    }

    // Update ETAs for remaining appointments since we now have a current consulting token
    await this.updateETAsBasedOnCurrentProgress(scheduleId);
  }

  /**
   * Update ETAs for all pending appointments based on current progress
   */
  static async updateETAsBasedOnCurrentProgress(scheduleId: number): Promise<void> {
    console.log(`🔄 Updating ETAs based on current progress for schedule ${scheduleId}`);
    
    // Get schedule details
    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId))
      .limit(1);

    if (!schedule.length) return;

    const avgTime = schedule[0].averageConsultationTime || this.DEFAULT_CONSULTATION_TIME;

    // Get current consulting token (in progress)
    const currentConsulting = await db
      .select({
        tokenNumber: appointments.tokenNumber
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "start")
        )
      )
      .orderBy(asc(appointments.tokenNumber))
      .limit(1);

    if (currentConsulting.length === 0) {
      console.log(`❌ No current consulting token found for schedule ${scheduleId}`);
      return;
    }

    const currentConsultingToken = currentConsulting[0].tokenNumber;
    console.log(`👤 Current consulting token: ${currentConsultingToken}, avg time: ${avgTime} min`);

    // Get all appointments to update (both scheduled and currently in progress)
    const appointmentsToUpdate = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        status: appointments.status
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          or(
            eq(appointments.status, "scheduled"),
            eq(appointments.status, "start")
          )
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    console.log(`🔄 Updating ${appointmentsToUpdate.length} appointments`);

    // Update ETAs for all relevant appointments
    const baseTime = new Date();
    
    for (const appointment of appointmentsToUpdate) {
      // tokensBefore = tokenNumber - currentConsultingToken
      const tokensBefore = appointment.tokenNumber - currentConsultingToken;
      let newETA: Date;
      
      if (appointment.status === "start") {
        // Currently in progress - ETA is now
        newETA = baseTime;
      } else {
        // ETA = now + (tokensBefore * avgConsultTime)
        const estimatedMinutes = Math.max(0, tokensBefore) * avgTime;
        newETA = addMinutes(baseTime, estimatedMinutes);
      }
      
      console.log(`🕐 Token ${appointment.tokenNumber}: ETA = ${format(newETA, 'HH:mm')} (${tokensBefore} tokens before × ${avgTime} min)`);
      
      await db
        .update(appointments)
        .set({ estimatedStartTime: newETA })
        .where(eq(appointments.id, appointment.id));
    }
    
    console.log(`✅ Progress-based ETA update complete`);
  }

  /**
   * Update ETA based on real consultation times after each completed appointment
   * Uses actual consultation times to calculate more accurate ETAs
   */
  static async updateETAOnAppointmentComplete(
    scheduleId: number,
    completedAppointmentId: number
  ): Promise<void> {
    console.log(`🔄 ETA Update: Processing completion for appointment ${completedAppointmentId}, schedule ${scheduleId}`);
    
    // Get the completed appointment to check if it has actualStartTime
    const completedAppointment = await db
      .select({
        actualStartTime: appointments.actualStartTime,
        tokenNumber: appointments.tokenNumber
      })
      .from(appointments)
      .where(eq(appointments.id, completedAppointmentId))
      .limit(1);

    if (!completedAppointment.length) {
      console.log(`❌ Completed appointment ${completedAppointmentId} not found`);
      return;
    }

    const now = new Date();
    
    // If no actualStartTime, estimate it based on previous completion and average time
    let actualStartTime = completedAppointment[0].actualStartTime;
    if (!actualStartTime) {
      console.log(`⚠️ Token ${completedAppointment[0].tokenNumber} completed without start time - estimating`);
      
      // Get the previous completed appointment to estimate start time
      const previousCompleted = await db
        .select({
          actualEndTime: appointments.actualEndTime,
          tokenNumber: appointments.tokenNumber
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.scheduleId, scheduleId),
            eq(appointments.status, "completed"),
            lt(appointments.tokenNumber, completedAppointment[0].tokenNumber),
            not(isNull(appointments.actualEndTime))
          )
        )
        .orderBy(desc(appointments.tokenNumber))
        .limit(1);

      if (previousCompleted.length > 0) {
        // Estimate start time as previous end time
        actualStartTime = previousCompleted[0].actualEndTime;
        console.log(`📍 Estimated start time based on previous completion: ${format(actualStartTime, 'HH:mm')}`);
      } else {
        // No previous completion, estimate based on schedule start time and average
        const schedule = await db
          .select({ startTime: doctorSchedules.startTime, date: doctorSchedules.date })
          .from(doctorSchedules)
          .where(eq(doctorSchedules.id, scheduleId))
          .limit(1);
        
        if (schedule.length > 0) {
          const [hours, minutes] = schedule[0].startTime.split(':').map(Number);
          const scheduleStart = new Date(schedule[0].date);
          scheduleStart.setHours(hours, minutes, 0, 0);
          actualStartTime = addMinutes(scheduleStart, (completedAppointment[0].tokenNumber - 1) * this.DEFAULT_CONSULTATION_TIME);
          console.log(`📍 Estimated start time based on schedule: ${format(actualStartTime, 'HH:mm')}`);
        } else {
          // Fallback: estimate 15 minutes before end time
          actualStartTime = addMinutes(now, -this.DEFAULT_CONSULTATION_TIME);
          console.log(`📍 Fallback start time estimate: ${format(actualStartTime, 'HH:mm')}`);
        }
      }
    }

    // Update both start and end times for the completed appointment
    await db
      .update(appointments)
      .set({ 
        actualStartTime: actualStartTime,
        actualEndTime: now 
      })
      .where(eq(appointments.id, completedAppointmentId));

    // Get all completed appointments for this schedule to calculate average
    const completedAppointments = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        actualStartTime: appointments.actualStartTime,
        actualEndTime: appointments.actualEndTime
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "completed"),
          // Ensure we have both start and end times
          not(isNull(appointments.actualStartTime)),
          not(isNull(appointments.actualEndTime))
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    console.log(`📊 Found ${completedAppointments.length} completed appointments`);

    // Calculate average consultation time from completed appointments
    let totalDuration = 0;
    let validAppointments = 0;
    const consultationTimes: number[] = [];

    for (const appt of completedAppointments) {
      if (appt.actualStartTime && appt.actualEndTime) {
        const duration = differenceInMinutes(appt.actualEndTime, appt.actualStartTime);
        console.log(`⏱️  Token ${appt.tokenNumber}: ${duration} minutes`);
        // Exclude outliers (consultations over 60 mins or under 5 mins)
        if (duration >= 5 && duration <= 60) {
          totalDuration += duration;
          validAppointments++;
          consultationTimes.push(duration);
        }
      }
    }

    // Calculate new average (default to 15 if no valid data)
    const newAverageTime = validAppointments > 0 
      ? Math.round(totalDuration / validAppointments) 
      : this.DEFAULT_CONSULTATION_TIME;

    console.log(`📈 New average consultation time: ${newAverageTime} minutes (from ${consultationTimes.join(', ')} minutes)`);

    // Update schedule with new average
    await db
      .update(doctorSchedules)
      .set({ averageConsultationTime: newAverageTime })
      .where(eq(doctorSchedules.id, scheduleId));

    // Get current consulting token (in progress)
    const currentConsulting = await db
      .select({
        tokenNumber: appointments.tokenNumber
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "start")
        )
      )
      .orderBy(asc(appointments.tokenNumber))
      .limit(1);

    // Current consulting token - if no one is currently consulting, use the last completed token + 1
    const currentConsultingToken = currentConsulting.length > 0 
      ? currentConsulting[0].tokenNumber 
      : (completedAppointments.length > 0 
          ? Math.max(...completedAppointments.map(a => a.tokenNumber)) + 1
          : 1);

    console.log(`👤 Current consulting token: ${currentConsultingToken}`);

    // Get all pending AND currently progressing appointments to update ETAs
    const appointmentsToUpdate = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        status: appointments.status
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          // Include both scheduled and currently in progress
          or(
            eq(appointments.status, "scheduled"),
            eq(appointments.status, "start")
          )
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    console.log(`🔄 Updating ETAs for ${appointmentsToUpdate.length} appointments`);

    // Update ETAs for all relevant appointments
    const baseTime = new Date(); // Current time as base
    
    for (const appointment of appointmentsToUpdate) {
      // Calculate tokens before this appointment
      // tokensBefore = tokenNumber - currentConsultingToken
      const tokensBefore = appointment.tokenNumber - currentConsultingToken;
      let newETA: Date;
      
      if (appointment.status === "start") {
        // Currently in progress - ETA is now
        newETA = baseTime;
      } else {
        // ETA = now + (tokensBefore * avgConsultTime)
        const estimatedMinutes = Math.max(0, tokensBefore) * newAverageTime;
        newETA = addMinutes(baseTime, estimatedMinutes);
      }
      
      console.log(`🕐 Token ${appointment.tokenNumber}: ETA = ${format(newETA, 'HH:mm')} (${tokensBefore} tokens before × ${newAverageTime} min)`);
      
      await db
        .update(appointments)
        .set({ estimatedStartTime: newETA })
        .where(eq(appointments.id, appointment.id));
    }
    
    console.log(`✅ ETA update complete for schedule ${scheduleId}`);
  }

  /**
   * Get current ETA for a specific appointment
   */
  static async getAppointmentETA(appointmentId: number): Promise<ETACalculationResult | null> {
    const appointment = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        scheduleId: appointments.scheduleId,
        estimatedStartTime: appointments.estimatedStartTime,
        status: appointments.status
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointment.length) return null;

    const { tokenNumber, estimatedStartTime, scheduleId } = appointment[0];

    // Get schedule details
    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId))
      .limit(1);

    if (!schedule.length) return null;

    const avgConsultationTime = schedule[0].averageConsultationTime || this.DEFAULT_CONSULTATION_TIME;

    // Get current consulting token (in progress)
    const currentConsulting = await db
      .select({
        tokenNumber: appointments.tokenNumber
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "start")
        )
      )
      .orderBy(asc(appointments.tokenNumber))
      .limit(1);

    // Get completed appointments to determine next token if no one is currently consulting
    const completedAppointments = await db
      .select({
        tokenNumber: appointments.tokenNumber
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "completed")
        )
      )
      .orderBy(desc(appointments.tokenNumber))
      .limit(1);

    const currentConsultingToken = currentConsulting.length > 0 
      ? currentConsulting[0].tokenNumber 
      : (completedAppointments.length > 0 
          ? completedAppointments[0].tokenNumber + 1
          : 1);

    return {
      appointmentId,
      tokenNumber,
      estimatedStartTime: estimatedStartTime || new Date(),
      currentConsultingToken,
      avgConsultationTime
    };
  }

  /**
   * Force update ETAs for a schedule based on current state
   * Useful for debugging or when ETAs get out of sync
   */
  static async forceUpdateETAs(scheduleId: number): Promise<void> {
    console.log(`🔧 Force updating ETAs for schedule ${scheduleId}`);
    
    // Get all completed appointments to calculate current average
    const completedAppointments = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        actualStartTime: appointments.actualStartTime,
        actualEndTime: appointments.actualEndTime,
        status: appointments.status
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "completed")
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    console.log(`📊 Found ${completedAppointments.length} completed appointments for average calculation`);

    // Calculate real average from completed appointments
    let totalDuration = 0;
    let validAppointments = 0;
    const consultationTimes: number[] = [];

    for (const appt of completedAppointments) {
      if (appt.actualStartTime && appt.actualEndTime) {
        const duration = differenceInMinutes(appt.actualEndTime, appt.actualStartTime);
        console.log(`⏱️ Token ${appt.tokenNumber}: ${duration} minutes (${format(appt.actualStartTime, 'HH:mm')} - ${format(appt.actualEndTime, 'HH:mm')})`);
        if (duration >= 1 && duration <= 120) { // More lenient bounds for debugging
          totalDuration += duration;
          validAppointments++;
          consultationTimes.push(duration);
        }
      } else {
        console.log(`❌ Token ${appt.tokenNumber}: Missing start/end times`);
      }
    }

    const newAverageTime = validAppointments > 0 
      ? Math.round(totalDuration / validAppointments) 
      : this.DEFAULT_CONSULTATION_TIME;

    console.log(`📈 Calculated average: ${newAverageTime} minutes from [${consultationTimes.join(', ')}]`);

    // Update schedule average
    await db
      .update(doctorSchedules)
      .set({ averageConsultationTime: newAverageTime })
      .where(eq(doctorSchedules.id, scheduleId));

    // Get current consulting token
    const currentConsulting = await db
      .select({ tokenNumber: appointments.tokenNumber })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "start")
        )
      )
      .limit(1);

    const currentToken = currentConsulting.length > 0 
      ? currentConsulting[0].tokenNumber 
      : (validAppointments > 0 ? Math.max(...completedAppointments.map(a => a.tokenNumber)) + 1 : 1);

    console.log(`👤 Current consulting token: ${currentToken}`);

    // Update remaining appointments
    const pendingAppointments = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        status: appointments.status
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          or(
            eq(appointments.status, "scheduled"),
            eq(appointments.status, "start")
          )
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    const now = new Date();
    console.log(`🔄 Updating ${pendingAppointments.length} pending appointments from time ${format(now, 'HH:mm')}`);

    for (const appointment of pendingAppointments) {
      const tokensBefore = appointment.tokenNumber - currentToken;
      let newETA: Date;
      
      if (appointment.status === "start") {
        newETA = now;
      } else {
        const estimatedMinutes = Math.max(0, tokensBefore) * newAverageTime;
        newETA = addMinutes(now, estimatedMinutes);
      }
      
      console.log(`🕐 Token ${appointment.tokenNumber}: ETA = ${format(newETA, 'HH:mm')} (${tokensBefore} tokens × ${newAverageTime} min)`);
      
      await db
        .update(appointments)
        .set({ estimatedStartTime: newETA })
        .where(eq(appointments.id, appointment.id));
    }

    console.log(`✅ Force update complete`);
  }

  /**
   * Recalculate all ETAs for a schedule (useful for corrections)
   */
  static async recalculateAllETAs(scheduleId: number): Promise<void> {
    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId))
      .limit(1);

    if (!schedule.length) return;

    const { startTime, actualArrivalTime, averageConsultationTime, date } = schedule[0];
    const avgTime = averageConsultationTime || this.DEFAULT_CONSULTATION_TIME;

    // Determine base time (doctor arrival or schedule start)
    let baseTime: Date;
    if (actualArrivalTime) {
      baseTime = new Date(actualArrivalTime);
    } else {
      const [hours, minutes] = startTime.split(':').map(Number);
      baseTime = new Date(date);
      baseTime.setHours(hours, minutes, 0, 0);
    }

    // Get all non-completed appointments
    const appointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          ne(appointments.status, "completed"),
          ne(appointments.status, "cancel")
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    // Update each appointment's ETA
    for (const appointment of appointments) {
      const estimatedMinutes = (appointment.tokenNumber - 1) * avgTime;
      const newETA = addMinutes(baseTime, estimatedMinutes);
      
      await db
        .update(appointments)
        .set({ estimatedStartTime: newETA })
        .where(eq(appointments.id, appointment.id));
    }
  }
}