import { db } from "../db";
import { appointments, doctorSchedules } from "@shared/schema";
import { eq, and, lt, gte, desc, asc, ne, isNull, not, or, sql, inArray } from "drizzle-orm";
import { format, parse, addMinutes, differenceInMinutes, setHours, setMinutes } from "date-fns";

export interface ETACalculationResult {
  appointmentId: number;
  tokenNumber: number;
  estimatedStartTime: Date;
  currentConsultingToken: number;
  completedTokenCount: number;
  avgConsultationTime: number;
  doctorHasArrived: boolean;
  consultationStarted: boolean;
  currentAppointmentStatus: string;
}

export class ETAService {
  private static DEFAULT_CONSULTATION_TIME = 15; // Default 15 minutes per consultation

  /**
   * Returns the effective average consultation time for ETA calculations.
   * Priority: learnedConsultationTime (system-computed, ≥3 samples) >
   *           averageConsultationTime (admin-configured) > DEFAULT (15 min).
   * The two columns are never mixed: the system only writes learnedConsultationTime
   * and the admin only controls averageConsultationTime.
   */
  private static getEffectiveAvgTime(
    configuredAvg: number | null | undefined,
    learnedAvg: number | null | undefined
  ): number {
    if (learnedAvg && learnedAvg > 0) {
      console.log(`[ETA] using learned avg: ${learnedAvg} min`);
      return learnedAvg;
    }
    const result = configuredAvg || this.DEFAULT_CONSULTATION_TIME;
    console.log(`[ETA] using configured avg: ${result} min`);
    return result;
  }

  /**
   * Computes the actual average from completed appointments and persists it
   * to learnedConsultationTime (only when ≥ 3 valid samples exist).
   * Never touches averageConsultationTime.
   */
  private static async updateLearnedAvg(scheduleId: number): Promise<number | null> {
    const completed = await db
      .select({ actualStartTime: appointments.actualStartTime, actualEndTime: appointments.actualEndTime })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "completed"),
          not(isNull(appointments.actualStartTime)),
          not(isNull(appointments.actualEndTime))
        )
      );

    const durations = completed
      .map(a => differenceInMinutes(new Date(a.actualEndTime!), new Date(a.actualStartTime!)))
      .filter(d => d >= 1 && d <= 60);

    if (durations.length < 3) {
      console.log(`[ETA] ${durations.length} sample(s) — not enough to update learned avg (need 3)`);
      return null;
    }

    const learned = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
    console.log(`[ETA] Updating learned avg to ${learned} min (${durations.length} samples: [${durations.join(', ')}])`);

    await db
      .update(doctorSchedules)
      .set({ learnedConsultationTime: learned })
      .where(eq(doctorSchedules.id, scheduleId));

    return learned;
  }

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

    const { startTime } = schedule[0];
    const avgTime = this.getEffectiveAvgTime(schedule[0].averageConsultationTime, schedule[0].learnedConsultationTime);

    // Parse schedule start time
    const [hours, minutes] = startTime.split(':').map(Number);
    const baseTime = new Date(scheduleDate);
    baseTime.setHours(hours, minutes, 0, 0);
    
    // Calculate ETA: scheduleStartTime + (tokenNumber - 1) * avgConsultTime
    // If schedule start time is already past, use current time as base
    const now = new Date();
    const effectiveBase = baseTime > now ? baseTime : now;
    const estimatedMinutes = (tokenNumber - 1) * avgTime;
    return addMinutes(effectiveBase, estimatedMinutes);
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

    const avgTime = this.getEffectiveAvgTime(schedule[0].averageConsultationTime, schedule[0].learnedConsultationTime);

    // Get all pending appointments for this schedule
    const pendingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "token_started")
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    // Update ETA for each pending appointment using relative queue position
    // (not absolute token number, since earlier tokens may be completed already)
    for (let i = 0; i < pendingAppointments.length; i++) {
      const appointment = pendingAppointments[i];
      // ETA = doctorArrivalTime + (relativePosition * avgConsultTime)
      const estimatedMinutes = i * avgTime;
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
            eq(appointments.status, "token_started"),
            eq(appointments.status, "in_progress")
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

    const avgTime = this.getEffectiveAvgTime(schedule[0].averageConsultationTime, schedule[0].learnedConsultationTime);

    // Get current in_progress appointment with its actual start time
    const currentConsulting = await db
      .select({
        tokenNumber: appointments.tokenNumber,
        actualStartTime: appointments.actualStartTime
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "in_progress")
        )
      )
      .orderBy(asc(appointments.tokenNumber))
      .limit(1);

    const now = new Date();
    let baseTime: Date; // = estimated time when current patient finishes (= start of next)

    if (currentConsulting.length === 0) {
      console.log(`⚠️ No token currently in progress for schedule ${scheduleId}`);

      // Find the next token_started appointment
      const nextScheduled = await db
        .select({ tokenNumber: appointments.tokenNumber })
        .from(appointments)
        .where(
          and(
            eq(appointments.scheduleId, scheduleId),
            eq(appointments.status, "token_started")
          )
        )
        .orderBy(asc(appointments.tokenNumber))
        .limit(1);

      if (nextScheduled.length === 0) {
        console.log(`❌ No scheduled appointments found for schedule ${scheduleId}`);
        return;
      }

      // No one in progress — next patient starts now
      baseTime = now;
      console.log(`📍 No one in progress, base time = now (${format(baseTime, 'HH:mm')})`);
    } else {
      // Someone is in progress — estimated finish = actualStartTime + avgTime
      const actualStart = currentConsulting[0].actualStartTime
        ? new Date(currentConsulting[0].actualStartTime)
        : now;
      baseTime = addMinutes(actualStart, avgTime);
      console.log(`👤 Token ${currentConsulting[0].tokenNumber} in progress since ${format(actualStart, 'HH:mm')}, estimated finish: ${format(baseTime, 'HH:mm')}`);
    }

    // Get all appointments to update (both token_started and currently in_progress)
    const appointmentsToUpdate = await db
      .select({
        id: appointments.id,
        tokenNumber: appointments.tokenNumber,
        status: appointments.status,
        actualStartTime: appointments.actualStartTime
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          or(
            eq(appointments.status, "token_started"),
            eq(appointments.status, "in_progress")
          )
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    console.log(`🔄 Updating ${appointmentsToUpdate.length} appointments`);

    // in_progress gets baseTime (estimated finish), token_started patients queue after that
    let waitingIndex = 0;
    for (const appointment of appointmentsToUpdate) {
      let newETA: Date;

      if (appointment.status === "in_progress") {
        // ETA = estimated finish time of current consultation
        newETA = baseTime;
      } else {
        // ETA = baseTime + (position in waiting queue * avgTime)
        newETA = addMinutes(baseTime, waitingIndex * avgTime);
        waitingIndex++;
      }

      console.log(`🕐 Token ${appointment.tokenNumber} (${appointment.status}): ETA = ${format(newETA, 'HH:mm')}`);

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
        // Exclude outliers (consultations over 60 mins or under 1 min)
        if (duration >= 1 && duration <= 60) {
          totalDuration += duration;
          validAppointments++;
          consultationTimes.push(duration);
        }
      }
    }

    // Persist learned avg to learnedConsultationTime (only if ≥ 3 samples).
    // Never touches averageConsultationTime (the admin-configured value).
    const learnedAvg = await this.updateLearnedAvg(scheduleId);

    // Fetch schedule to get effective avg for the ETA update that follows
    const scheduleForAvg = await db
      .select({ averageConsultationTime: doctorSchedules.averageConsultationTime, learnedConsultationTime: doctorSchedules.learnedConsultationTime })
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId))
      .limit(1);
    const newAverageTime = this.getEffectiveAvgTime(scheduleForAvg[0]?.averageConsultationTime, scheduleForAvg[0]?.learnedConsultationTime);

    console.log(`📈 Effective avg for ETA: ${newAverageTime} min (learned: ${learnedAvg ?? 'not enough samples yet'})`);

    // Get current in_progress appointment with actual start time
    const currentConsulting = await db
      .select({
        tokenNumber: appointments.tokenNumber,
        actualStartTime: appointments.actualStartTime
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "in_progress")
        )
      )
      .orderBy(asc(appointments.tokenNumber))
      .limit(1);

    // baseTime = estimated finish of current patient = when next patient starts
    let baseTime: Date;
    if (currentConsulting.length > 0) {
      const actualStart = currentConsulting[0].actualStartTime
        ? new Date(currentConsulting[0].actualStartTime)
        : now;
      baseTime = addMinutes(actualStart, newAverageTime);
      console.log(`👤 Token ${currentConsulting[0].tokenNumber} in progress since ${format(actualStart, 'HH:mm')}, estimated finish: ${format(baseTime, 'HH:mm')}`);
    } else {
      baseTime = now;
      console.log(`📍 No one in progress, base time = now (${format(baseTime, 'HH:mm')})`);
    }

    // Get all pending AND currently in_progress appointments to update ETAs
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
            eq(appointments.status, "token_started"),
            eq(appointments.status, "in_progress")
          )
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    console.log(`🔄 Updating ETAs for ${appointmentsToUpdate.length} appointments`);

    let waitingIndex = 0;
    for (const appointment of appointmentsToUpdate) {
      let newETA: Date;

      if (appointment.status === "in_progress") {
        newETA = baseTime; // estimated finish time
      } else {
        newETA = addMinutes(baseTime, waitingIndex * newAverageTime);
        waitingIndex++;
      }

      console.log(`🕐 Token ${appointment.tokenNumber} (${appointment.status}): ETA = ${format(newETA, 'HH:mm')}`);

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
        actualEndTime: appointments.actualEndTime,
        status: appointments.status,
        date: appointments.date
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointment.length) return null;

    const { tokenNumber, estimatedStartTime, scheduleId, date } = appointment[0];

    // Get schedule details
    const schedule = await db
      .select()
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId))
      .limit(1);

    if (!schedule.length) return null;

    const avgConsultationTime = this.getEffectiveAvgTime(schedule[0].averageConsultationTime, schedule[0].learnedConsultationTime);

    // Check if doctor has arrived for this schedule and date
    const { doctorDailyPresence } = await import("@shared/schema");
    
    const doctorPresence = await db
      .select({
        hasArrived: doctorDailyPresence.hasArrived
      })
      .from(doctorDailyPresence)
      .where(
        and(
          eq(doctorDailyPresence.doctorId, schedule[0].doctorId),
          eq(doctorDailyPresence.clinicId, schedule[0].clinicId),
          eq(doctorDailyPresence.scheduleId, scheduleId)
          // scheduleId is already date-specific, no need for date filter
        )
      )
      .limit(1);

    const doctorHasArrived = doctorPresence.length > 0 ? doctorPresence[0].hasArrived : false;

    // Get current in_progress appointment with actual start time
    const currentConsulting = await db
      .select({
        tokenNumber: appointments.tokenNumber,
        actualStartTime: appointments.actualStartTime
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "in_progress")
        )
      )
      .orderBy(asc(appointments.tokenNumber))
      .limit(1);

    const currentConsultingToken = currentConsulting.length > 0 ? currentConsulting[0].tokenNumber : null;

    // Get count of completed appointments for display
    const completedAppointmentsCount = await db
      .select({ count: sql<number>`COUNT(*)::integer` })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "completed")
        )
      );

    const completedTokenCount = completedAppointmentsCount[0]?.count || 0;

    // --- LIVE ETA CALCULATION ---
    // Instead of returning the stale stored value, compute a fresh estimate now.
    const now = new Date();
    let liveEstimatedStartTime: Date;

    if (appointment[0].status === "completed") {
      // Completed — show actual end time if available, otherwise fall back to stored estimate
      const actualEnd = appointment[0].actualEndTime ? new Date(appointment[0].actualEndTime) : null;
      liveEstimatedStartTime = actualEnd || (estimatedStartTime ? new Date(estimatedStartTime) : now);
    } else if (appointment[0].status === "in_progress") {
      // Currently being seen — ETA = estimated finish = max(actualStart + avg, now)
      const actualStart = currentConsulting[0]?.actualStartTime
        ? new Date(currentConsulting[0].actualStartTime)
        : now;
      liveEstimatedStartTime = new Date(Math.max(
        addMinutes(actualStart, avgConsultationTime).getTime(),
        now.getTime()
      ));
    } else {
      // token_started — calculate dynamically based on current in_progress state
      if (currentConsulting.length > 0 && currentConsulting[0].actualStartTime) {
        // Someone is being seen right now — estimate their finish then queue this patient
        const actualStart = new Date(currentConsulting[0].actualStartTime);
        const estimatedCurrentFinish = new Date(Math.max(
          addMinutes(actualStart, avgConsultationTime).getTime(),
          now.getTime()
        ));
        // Count how many waiting patients (token_started or scheduled) are ahead of this one
        const aheadCount = await db
          .select({ count: sql<number>`COUNT(*)::integer` })
          .from(appointments)
          .where(
            and(
              eq(appointments.scheduleId, scheduleId),
              inArray(appointments.status, ["token_started", "scheduled"]),
              sql`${appointments.tokenNumber} < ${tokenNumber}`
            )
          );
        const patientsAhead = aheadCount[0]?.count || 0;
        liveEstimatedStartTime = addMinutes(estimatedCurrentFinish, patientsAhead * avgConsultationTime);
      } else if (completedTokenCount > 0) {
        // No one in progress but queue has already started — count waiting patients ahead
        const aheadCount = await db
          .select({ count: sql<number>`COUNT(*)::integer` })
          .from(appointments)
          .where(
            and(
              eq(appointments.scheduleId, scheduleId),
              inArray(appointments.status, ["token_started", "scheduled"]),
              sql`${appointments.tokenNumber} < ${tokenNumber}`
            )
          );
        const patientsAhead = aheadCount[0]?.count || 0;
        // Base = now (no one being seen, next patient should be called immediately)
        liveEstimatedStartTime = addMinutes(now, patientsAhead * avgConsultationTime);
      } else {
        // Doctor hasn't started yet, nothing in progress, nothing completed
        // Still need to count token_started patients ahead in the queue
        const aheadCount = await db
          .select({ count: sql<number>`COUNT(*)::integer` })
          .from(appointments)
          .where(
            and(
              eq(appointments.scheduleId, scheduleId),
              inArray(appointments.status, ["token_started", "scheduled"]),
              sql`${appointments.tokenNumber} < ${tokenNumber}`
            )
          );
        const patientsAhead = aheadCount[0]?.count || 0;
        if (patientsAhead > 0) {
          liveEstimatedStartTime = addMinutes(now, patientsAhead * avgConsultationTime);
        } else {
          // No one ahead — use stored value, but never show a past time
          const stored = estimatedStartTime ? new Date(estimatedStartTime) : null;
          liveEstimatedStartTime = (stored && stored > now) ? stored : now;
        }
      }
    }

    const consultationStarted = currentConsulting.length > 0 || completedTokenCount > 0;

    console.log(`[ETA] Appt ${appointmentId} (token ${tokenNumber}, ${appointment[0].status}): live ETA=${format(liveEstimatedStartTime, 'HH:mm')}`);

    return {
      appointmentId,
      tokenNumber,
      estimatedStartTime: liveEstimatedStartTime,
      currentConsultingToken,
      completedTokenCount,
      avgConsultationTime,
      doctorHasArrived,
      consultationStarted,
      currentAppointmentStatus: appointment[0].status
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

    await this.updateLearnedAvg(scheduleId);
    const scheduleForForce = await db
      .select({ averageConsultationTime: doctorSchedules.averageConsultationTime, learnedConsultationTime: doctorSchedules.learnedConsultationTime })
      .from(doctorSchedules)
      .where(eq(doctorSchedules.id, scheduleId))
      .limit(1);
    const newAverageTime = this.getEffectiveAvgTime(scheduleForForce[0]?.averageConsultationTime, scheduleForForce[0]?.learnedConsultationTime);

    console.log(`📈 Effective avg: ${newAverageTime} min from [${consultationTimes.join(', ')}]`);

    // Get current in_progress appointment with actual start time
    const currentConsulting = await db
      .select({ tokenNumber: appointments.tokenNumber, actualStartTime: appointments.actualStartTime })
      .from(appointments)
      .where(
        and(
          eq(appointments.scheduleId, scheduleId),
          eq(appointments.status, "in_progress")
        )
      )
      .limit(1);

    const now = new Date();
    let baseTime: Date; // estimated finish time of current patient = start of next

    if (currentConsulting.length > 0) {
      const actualStart = currentConsulting[0].actualStartTime
        ? new Date(currentConsulting[0].actualStartTime)
        : now;
      baseTime = addMinutes(actualStart, newAverageTime);
      console.log(`👤 Token ${currentConsulting[0].tokenNumber} in progress since ${format(actualStart, 'HH:mm')}, estimated finish: ${format(baseTime, 'HH:mm')}`);
    } else {
      // No one in progress — next patient starts now
      baseTime = now;
      console.log(`📍 No one in progress, base time = now (${format(baseTime, 'HH:mm')})`);
    }

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
            eq(appointments.status, "token_started"),
            eq(appointments.status, "in_progress")
          )
        )
      )
      .orderBy(asc(appointments.tokenNumber));

    console.log(`🔄 Updating ${pendingAppointments.length} pending appointments`);

    let waitingIndex = 0;
    for (const appointment of pendingAppointments) {
      let newETA: Date;

      if (appointment.status === "in_progress") {
        newETA = baseTime; // estimated finish time
      } else {
        newETA = addMinutes(baseTime, waitingIndex * newAverageTime);
        waitingIndex++;
      }

      console.log(`🕐 Token ${appointment.tokenNumber} (${appointment.status}): ETA = ${format(newETA, 'HH:mm')}`);

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

    const { startTime, actualArrivalTime, date } = schedule[0];
    const avgTime = this.getEffectiveAvgTime(schedule[0].averageConsultationTime, schedule[0].learnedConsultationTime);

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

    // Update each appointment's ETA using relative queue position
    for (let i = 0; i < appointments.length; i++) {
      const appointment = appointments[i];
      const estimatedMinutes = i * avgTime;
      const newETA = addMinutes(baseTime, estimatedMinutes);

      await db
        .update(appointments)
        .set({ estimatedStartTime: newETA })
        .where(eq(appointments.id, appointment.id));
    }
  }
}