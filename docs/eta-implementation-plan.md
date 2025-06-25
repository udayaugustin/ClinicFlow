# ClinicFlow ETA System - Complete Implementation Plan

## Overview

This document outlines the complete implementation plan for a 3-stage Estimated Time of Arrival (ETA) system for ClinicFlow. The system provides patients with increasingly accurate appointment time estimates that adapt to real clinic conditions.

## System Architecture

### Current ClinicFlow Foundation ✅
- **Status Flow**: `token_started` → `in_progress` → `completed`
- **Doctor Arrival**: Tracked via `doctorDailyPresence` table
- **Token System**: Sequential numbering with `getCurrentTokenProgress()`
- **Data Available**: `scheduleStartTime`, `tokenNumber`, `consultationDuration`
- **UI Framework**: Patient dashboard with 30-second refresh cycle

### Three ETA Stages

1. **Stage 1**: Schedule-based ETA (before doctor arrives)
2. **Stage 2**: Doctor arrival-based ETA (when doctor arrives)
3. **Stage 3**: Real-time ETA with moving averages (during consultations)

---

## PHASE 1: Initial ETA (Schedule-Based)

### Formula
```
ETA = scheduleStartTime + (tokenNumber - 1) * avgConsultTime
```

### When It Shows
- **Status**: `token_started` (before doctor arrives)
- **Trigger**: Immediately after appointment booking
- **Example**: Token 2 at 6PM schedule with 15min duration → **6:15 PM**

### Implementation Details

#### Backend Changes

**File**: `server/routes.ts`

Add ETA calculation utility function:
```typescript
/**
 * Calculate initial ETA based on schedule start time
 * @param scheduleStartTime - Schedule start time in HH:MM format (e.g., "18:00")
 * @param tokenNumber - Patient's token number (1, 2, 3...)
 * @param consultationDuration - Doctor's consultation duration in minutes
 * @returns Date object representing estimated appointment time
 */
function calculateInitialETA(
  scheduleStartTime: string, 
  tokenNumber: number, 
  consultationDuration: number
): Date {
  const [hours, minutes] = scheduleStartTime.split(':').map(Number);
  const scheduleStart = new Date();
  scheduleStart.setHours(hours, minutes, 0, 0);
  
  const etaMinutes = (tokenNumber - 1) * consultationDuration;
  return new Date(scheduleStart.getTime() + etaMinutes * 60000);
}
```

Enhance appointment booking response (around line 168-221):
```typescript
// After creating appointment
const appointment = await storage.createAppointment(appointmentData);

// Get doctor details for consultation duration
const doctorDetails = await storage.getDoctorDetails(appointment.doctorId);

// Calculate Stage 1 ETA
const eta = calculateInitialETA(
  schedule.startTime, 
  appointment.tokenNumber, 
  doctorDetails.consultationDuration
);

// Return appointment with ETA
res.status(201).json({ 
  ...appointment, 
  estimatedTime: eta.toISOString(),
  etaStage: 1 
});
```

#### Frontend Changes

**File**: `client/src/components/eta-display.tsx` (new file)
```tsx
import React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ETADisplayProps {
  estimatedTime: Date;
  stage: 1 | 2 | 3;
  context?: string;
  movingAverage?: number;
}

export function ETADisplay({ 
  estimatedTime, 
  stage, 
  context,
  movingAverage 
}: ETADisplayProps) {
  const getStageInfo = () => {
    switch (stage) {
      case 1:
        return {
          label: 'Scheduled',
          variant: 'outline' as const,
          description: context || 'Based on scheduled start time'
        };
      case 2:
        return {
          label: 'Updated',
          variant: 'secondary' as const,
          description: context || 'Updated for doctor arrival'
        };
      case 3:
        return {
          label: 'Live',
          variant: 'default' as const,
          description: context || `Based on ${movingAverage}min average`
        };
    }
  };

  const stageInfo = getStageInfo();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-blue-500" />
        <span className="font-medium">ETA: {format(estimatedTime, "h:mm a")}</span>
        <Badge variant={stageInfo.variant}>{stageInfo.label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{stageInfo.description}</p>
    </div>
  );
}
```

**File**: `client/src/pages/patient-booking-page.tsx`

Enhance success message (around line 103-108):
```tsx
onSuccess: (response) => {
  queryClient.invalidateQueries({ queryKey: ["/api/patient/appointments"] });
  queryClient.invalidateQueries({ 
    queryKey: [`/api/doctors/${doctorId}/available-slots`]
  });
  queryClient.invalidateQueries({ queryKey: ["schedulesToday"] });
  refetchSlots();
  
  toast({
    title: "Appointment Booked Successfully!",
    description: response.estimatedTime 
      ? `Your estimated appointment time: ${format(new Date(response.estimatedTime), "h:mm a")}`
      : "Appointment booked successfully",
  });
  navigate("/appointments");
}
```

**File**: `client/src/pages/booking-history.tsx`

Add ETA display for token_started appointments (around line 319-347):
```tsx
// Add this helper function at the top of the component
const calculateInitialETA = (appointment: AppointmentWithDoctor) => {
  if (!appointment.schedule?.startTime || !appointment.doctor?.consultationDuration) {
    return null;
  }
  
  const [hours, minutes] = appointment.schedule.startTime.split(':').map(Number);
  const scheduleStart = new Date();
  scheduleStart.setHours(hours, minutes, 0, 0);
  
  const etaMinutes = (appointment.tokenNumber - 1) * appointment.doctor.consultationDuration;
  return new Date(scheduleStart.getTime() + etaMinutes * 60000);
};

// Add ETA display in the appointment card rendering
{appointment.status === "token_started" && (
  <div className="mt-3">
    {(() => {
      const eta = calculateInitialETA(appointment);
      return eta ? (
        <ETADisplay 
          estimatedTime={eta} 
          stage={1}
          context="Your estimated appointment time"
        />
      ) : null;
    })()}
  </div>
)}
```

#### Type Definitions

**File**: `shared/schema.ts`

Add ETA-related types:
```typescript
// Add to appointment response types
export interface AppointmentWithETA extends Appointment {
  estimatedTime?: string;
  etaStage?: 1 | 2 | 3;
}

// Add ETA calculation types
export interface ETACalculationData {
  scheduleStartTime: string;
  tokenNumber: number;
  consultationDuration: number;
  doctorArrivalTime?: Date;
  movingAverage?: number;
}
```

#### Testing Phase 1

Test scenarios:
- **Token 1**: 6:00 PM schedule → **6:00 PM** ✅
- **Token 2**: 6:00 PM schedule → **6:15 PM** ✅  
- **Token 3**: 6:00 PM schedule → **6:30 PM** ✅
- **Different consultation durations**: 10min, 15min, 20min, 30min
- **Different schedule times**: Morning, afternoon, evening schedules

---

## PHASE 2: Doctor Arrival ETA Update

### Formula
```
ETA = doctorArrivalTime + (tokenNumber - 1) * avgConsultTime
```

### When It Shows
- **Status**: `in_progress` (after doctor arrives)
- **Trigger**: When doctor marked as arrived
- **Example**: Doctor arrives 6:30 PM, Token 2 → **6:45 PM**

### Implementation Details

#### Backend Enhancement

**File**: `server/routes.ts`

Add arrival-based ETA calculation:
```typescript
/**
 * Calculate ETA based on doctor's actual arrival time
 * @param doctorArrivalTime - When doctor actually arrived
 * @param tokenNumber - Patient's token number
 * @param consultationDuration - Doctor's consultation duration in minutes
 * @returns Date object representing updated appointment time
 */
function calculateArrivalETA(
  doctorArrivalTime: Date, 
  tokenNumber: number, 
  consultationDuration: number
): Date {
  const etaMinutes = (tokenNumber - 1) * consultationDuration;
  return new Date(doctorArrivalTime.getTime() + etaMinutes * 60000);
}
```

Enhance doctor arrival handler (around line 1154-1170):
```typescript
// When doctor arrives, update all token_started appointments
for (const appointment of tokenStartedAppointments) {
  await storage.updateAppointmentStatus(
    appointment.id,
    "in_progress",
    "Doctor has arrived - appointment started"
  );
  
  // Calculate Stage 2 ETA
  const doctorDetails = await storage.getDoctorDetails(appointment.doctorId);
  const eta = calculateArrivalETA(
    dateObj, 
    appointment.tokenNumber, 
    doctorDetails.consultationDuration
  );
  
  // Send notification with updated ETA
  if (appointment.patientId) {
    await notificationService.generateStatusNotification(
      appointment, 
      "in_progress", 
      `Doctor has arrived. Your updated ETA: ${format(eta, "h:mm a")}`
    );
  }
}
```

Add new API endpoint for getting appointment ETA:
```typescript
// Get current ETA for a specific appointment
app.get("/api/appointments/:id/eta", async (req, res) => {
  if (!req.user) return res.sendStatus(401);
  
  try {
    const appointmentId = parseInt(req.params.id);
    const appointment = await storage.getAppointmentWithDetails(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if user has access to this appointment
    if (appointment.patientId !== req.user.id && req.user.role !== "attender" && req.user.role !== "doctor") {
      return res.sendStatus(403);
    }
    
    const eta = await calculateCurrentETA(appointment);
    res.json({ 
      estimatedTime: eta.toISOString(),
      etaStage: getETAStage(appointment)
    });
  } catch (error) {
    console.error('Error getting appointment ETA:', error);
    res.status(500).json({ message: 'Failed to get appointment ETA' });
  }
});
```

#### Frontend Enhancement

**File**: `client/src/pages/booking-history.tsx`

Replace doctor arrival message with ETA (around line 349-354):
```tsx
// Replace the existing doctor arrival message
{appointment.status === "in_progress" && doctorHasArrived && (
  <div className="mt-3">
    {(() => {
      const eta = calculateArrivalETA(appointment, doctorArrivalTime);
      return eta ? (
        <ETADisplay 
          estimatedTime={eta} 
          stage={2}
          context="Updated based on doctor arrival"
        />
      ) : (
        <div className="text-sm text-center text-green-600 font-medium flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Your doctor has arrived at the clinic
        </div>
      );
    })()}
  </div>
)}
```

Add helper function for Stage 2 ETA calculation:
```tsx
const calculateArrivalETA = (appointment: AppointmentWithDoctor, arrivalTime?: Date) => {
  if (!arrivalTime || !appointment.doctor?.consultationDuration) {
    return null;
  }
  
  const etaMinutes = (appointment.tokenNumber - 1) * appointment.doctor.consultationDuration;
  return new Date(arrivalTime.getTime() + etaMinutes * 60000);
};
```

#### Testing Phase 2

Test scenarios:
- **Original schedule**: T1=6:00, T2=6:15, T3=6:30
- **Doctor arrives on time (6:00)**: ETAs remain same
- **Doctor arrives late (6:30)**: T1=6:30, T2=6:45, T3=7:00 ✅
- **Doctor arrives early (5:45)**: T1=5:45, T2=6:00, T3=6:15
- **Multiple doctors**: Each doctor's arrival affects only their appointments

---

## PHASE 3: Real-Time ETA with Moving Averages

### Formula
```
avgConsultTime = sum(actualConsultationTimes) / count
ETA = currentTime + (tokensAhead * avgConsultTime)
tokensAhead = tokenNumber - currentConsultingToken
```

### When It Shows
- **Status**: Any active appointment during consultations
- **Trigger**: Every time appointment marked "completed"
- **Example**: T1 took 30min, T2 took 45min → avgTime=37.5min → T4 ETA updates

### Implementation Details

#### Database Schema Changes

Create new migration file:
```sql
-- Migration: Add consultation timing fields
-- File: migrations/0025_add_consultation_timing.sql

ALTER TABLE appointments ADD COLUMN status_start_time TIMESTAMP;
ALTER TABLE appointments ADD COLUMN status_end_time TIMESTAMP;
ALTER TABLE appointments ADD COLUMN consultation_duration INTEGER;

-- Add indexes for performance
CREATE INDEX idx_appointments_status_times ON appointments(doctor_id, clinic_id, date, status);
CREATE INDEX idx_appointments_consultation_duration ON appointments(consultation_duration) WHERE consultation_duration IS NOT NULL;
```

#### Backend Implementation

**File**: `server/routes.ts`

Enhanced status update with timing (replace existing status update around line 223-241):
```typescript
/**
 * Update appointment status with timing tracking for Stage 3 ETA
 */
app.patch("/api/appointments/:id/status", async (req, res) => {
  if (!req.user || req.user.role !== "attender") return res.sendStatus(403);
  
  try {
    const appointmentId = parseInt(req.params.id);
    const { status, statusNotes } = req.body;
    const currentTime = new Date();

    const allowedStatuses = ["token_started", "in_progress", "hold", "pause", "cancel", "completed"];
    
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` 
      });
    }

    // Get current appointment to check previous status
    const currentAppointment = await storage.getAppointment(appointmentId);
    if (!currentAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Prepare update data with timing
    const updateData: any = { 
      status, 
      statusNotes 
    };

    // Track consultation start time
    if (status === "in_progress" && currentAppointment.status !== "in_progress") {
      updateData.statusStartTime = currentTime;
    }

    // Track consultation end time and calculate duration
    if (status === "completed" && currentAppointment.statusStartTime) {
      updateData.statusEndTime = currentTime;
      const duration = Math.round(
        (currentTime.getTime() - new Date(currentAppointment.statusStartTime).getTime()) / (1000 * 60)
      );
      updateData.consultationDuration = duration;

      console.log(`Consultation completed: ${duration} minutes`);

      // Trigger Stage 3 ETA recalculation for all remaining appointments
      await recalculateRealTimeETAs(
        currentAppointment.doctorId,
        currentAppointment.clinicId,
        new Date()
      );
    }

    // Update the appointment
    const updatedAppointment = await storage.updateAppointmentStatusEnhanced(
      appointmentId, 
      updateData
    );

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

/**
 * Recalculate ETAs for all remaining appointments when a consultation completes
 */
async function recalculateRealTimeETAs(doctorId: number, clinicId: number, date: Date) {
  try {
    // Get updated moving average
    const movingAverage = await storage.calculateMovingAverage(doctorId, clinicId, date);
    
    // Get current token progress
    const currentProgress = await storage.getCurrentTokenProgress(doctorId, clinicId, date);
    
    // Get all remaining appointments for today
    const remainingAppointments = await storage.getRemainingAppointmentsToday(doctorId, clinicId, date);
    
    console.log(`Recalculating ETAs: moving average = ${movingAverage} minutes, current token = ${currentProgress.currentToken}`);
    
    // Send updated ETAs to patients (via notifications or real-time updates)
    for (const appointment of remainingAppointments) {
      if (appointment.patientId && appointment.status !== "completed") {
        const eta = calculateRealTimeETA(appointment.tokenNumber, currentProgress.currentToken, movingAverage);
        
        // Could send notification about updated ETA
        // await notificationService.createNotification({
        //   userId: appointment.patientId,
        //   appointmentId: appointment.id,
        //   title: "Updated ETA",
        //   message: `Your appointment time has been updated to ${format(eta, "h:mm a")}`,
        //   type: "eta_update"
        // });
      }
    }
  } catch (error) {
    console.error('Error recalculating real-time ETAs:', error);
  }
}

/**
 * Calculate real-time ETA based on current progress and moving average
 */
function calculateRealTimeETA(tokenNumber: number, currentToken: number, movingAverage: number): Date {
  const tokensAhead = Math.max(0, tokenNumber - currentToken);
  const etaMinutes = tokensAhead * movingAverage;
  return new Date(Date.now() + etaMinutes * 60000);
}
```

**File**: `server/storage.ts`

Add moving average calculation methods:
```typescript
/**
 * Calculate moving average consultation time for a doctor on a specific date
 */
async calculateMovingAverage(doctorId: number, clinicId: number, date: Date): Promise<number> {
  try {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const completedToday = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.clinicId, clinicId),
          gte(appointments.date, dayStart),
          lte(appointments.date, dayEnd),
          eq(appointments.status, "completed"),
          not(eq(appointments.consultationDuration, null))
        )
      );

    if (completedToday.length === 0) {
      // Fallback to doctor's standard duration
      const doctorDetails = await this.getDoctorDetails(doctorId);
      const standardDuration = doctorDetails?.consultationDuration || 15;
      console.log(`No completed consultations yet, using standard duration: ${standardDuration} minutes`);
      return standardDuration;
    }

    // Calculate moving average
    const totalTime = completedToday.reduce((sum, apt) => sum + (apt.consultationDuration || 0), 0);
    const average = Math.round(totalTime / completedToday.length);
    
    console.log(`Moving average calculated: ${average} minutes from ${completedToday.length} consultations`);
    return average;
  } catch (error) {
    console.error('Error calculating moving average:', error);
    // Fallback to standard duration
    const doctorDetails = await this.getDoctorDetails(doctorId);
    return doctorDetails?.consultationDuration || 15;
  }
}

/**
 * Get remaining appointments for today that are not completed
 */
async getRemainingAppointmentsToday(doctorId: number, clinicId: number, date: Date) {
  try {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.clinicId, clinicId),
          gte(appointments.date, dayStart),
          lte(appointments.date, dayEnd),
          not(eq(appointments.status, "completed")),
          not(eq(appointments.status, "cancel"))
        )
      )
      .orderBy(appointments.tokenNumber);
  } catch (error) {
    console.error('Error getting remaining appointments:', error);
    return [];
  }
}

/**
 * Enhanced appointment status update with timing data
 */
async updateAppointmentStatusEnhanced(
  appointmentId: number, 
  updateData: {
    status: string;
    statusNotes?: string;
    statusStartTime?: Date;
    statusEndTime?: Date;
    consultationDuration?: number;
  }
): Promise<Appointment> {
  try {
    const [updated] = await db
      .update(appointments)
      .set({
        status: updateData.status,
        statusNotes: updateData.statusNotes,
        statusStartTime: updateData.statusStartTime,
        statusEndTime: updateData.statusEndTime,
        consultationDuration: updateData.consultationDuration
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

    if (!updated) {
      throw new Error('Appointment not found');
    }

    return updated;
  } catch (error) {
    console.error('Error updating appointment status with timing:', error);
    throw error;
  }
}
```

#### Frontend Implementation

**File**: `client/src/components/eta-display.tsx`

Update component to handle all three stages:
```tsx
// Update the existing component to handle Stage 3
export function ETADisplay({ 
  estimatedTime, 
  stage, 
  context,
  movingAverage,
  isLive = false 
}: ETADisplayProps) {
  const getStageInfo = () => {
    switch (stage) {
      case 1:
        return {
          label: 'Scheduled',
          variant: 'outline' as const,
          description: context || 'Based on scheduled start time',
          color: 'text-blue-600'
        };
      case 2:
        return {
          label: 'Updated',
          variant: 'secondary' as const,
          description: context || 'Updated for doctor arrival',
          color: 'text-green-600'
        };
      case 3:
        return {
          label: isLive ? 'Live' : 'Real-time',
          variant: 'default' as const,
          description: context || `Based on ${movingAverage}min average consultation time`,
          color: 'text-purple-600'
        };
    }
  };

  const stageInfo = getStageInfo();

  return (
    <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm">
        <Clock className={`h-4 w-4 ${stageInfo.color}`} />
        <span className="font-medium">ETA: {format(estimatedTime, "h:mm a")}</span>
        <Badge variant={stageInfo.variant}>{stageInfo.label}</Badge>
        {stage === 3 && isLive && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{stageInfo.description}</p>
    </div>
  );
}
```

**File**: `client/src/pages/booking-history.tsx`

Add real-time ETA calculation and moving average queries:
```tsx
// Add moving average query for each doctor-clinic pair
const { data: movingAverages } = useQuery<Record<string, number>>({
  queryKey: ["moving-averages", uniquePairs],
  queryFn: async () => {
    const averagePromises = uniquePairs.map(async ({ doctorId, clinicId }) => {
      const res = await fetch(`/api/doctors/${doctorId}/moving-average?clinicId=${clinicId}&date=${new Date().toISOString()}`);
      if (!res.ok) return { key: `${doctorId}-${clinicId}`, average: 15 }; // fallback
      const data = await res.json();
      return { key: `${doctorId}-${clinicId}`, average: data.movingAverage };
    });

    const averageResults = await Promise.all(averagePromises);
    return Object.fromEntries(averageResults.map(({ key, average }) => [key, average]));
  },
  enabled: uniquePairs.length > 0,
  refetchInterval: 30000 // Update every 30 seconds
});

// Add ETA stage detection helper
const getETAStage = (appointment: AppointmentWithDoctor, hasMovingAverageData: boolean) => {
  if (appointment.status === "token_started") return 1;
  if (appointment.status === "in_progress" && !hasMovingAverageData) return 2;
  return 3;
};

// Add real-time ETA calculation
const calculateRealTimeETA = (
  appointment: AppointmentWithDoctor, 
  currentToken: number, 
  movingAverage: number
) => {
  const tokensAhead = Math.max(0, appointment.tokenNumber - currentToken);
  const etaMinutes = tokensAhead * movingAverage;
  return new Date(Date.now() + etaMinutes * 60000);
};

// Update the appointment card rendering to show appropriate ETA
{(() => {
  const progress = tokenProgressMap?.[`${appointment.doctorId}-${appointment.clinicId}`];
  const movingAverage = movingAverages?.[`${appointment.doctorId}-${appointment.clinicId}`] || 15;
  const hasMovingAverageData = movingAverage !== 15; // Assuming 15 is the fallback
  const stage = getETAStage(appointment, hasMovingAverageData);
  
  let eta: Date | null = null;
  
  if (stage === 1) {
    eta = calculateInitialETA(appointment);
  } else if (stage === 2) {
    const arrivalTime = /* get doctor arrival time */;
    eta = arrivalTime ? calculateArrivalETA(appointment, arrivalTime) : null;
  } else if (stage === 3 && progress) {
    eta = calculateRealTimeETA(appointment, progress.currentToken, movingAverage);
  }
  
  return eta && appointment.status !== "completed" && appointment.status !== "cancel" ? (
    <div className="mt-3">
      <ETADisplay 
        estimatedTime={eta} 
        stage={stage}
        movingAverage={stage === 3 ? movingAverage : undefined}
        isLive={stage === 3}
      />
    </div>
  ) : null;
})()}
```

Add new API endpoint for moving average:
**File**: `server/routes.ts`
```typescript
// Get moving average for a doctor on a specific date
app.get("/api/doctors/:id/moving-average", async (req, res) => {
  try {
    const doctorId = parseInt(req.params.id);
    const { clinicId, date } = req.query;
    
    if (!clinicId || !date) {
      return res.status(400).json({ 
        error: 'clinicId and date are required' 
      });
    }
    
    const movingAverage = await storage.calculateMovingAverage(
      doctorId,
      parseInt(clinicId as string),
      new Date(date as string)
    );
    
    res.json({ movingAverage });
  } catch (error) {
    console.error('Error getting moving average:', error);
    res.status(500).json({ error: 'Failed to get moving average' });
  }
});
```

#### Testing Phase 3

Test scenarios following your examples:

**Scenario 1**: Token 1 completed (30 min), Token 2 in progress
```
avgConsultTime = 30 minutes
currentConsultingToken = 2
currentTime = 7:00

ETA for T3 = 7:00 + ((3-2) * 30) = 7:30 ✅
ETA for T4 = 7:00 + ((4-2) * 30) = 8:00 ✅
ETA for T5 = 7:00 + ((5-2) * 30) = 8:30 ✅
```

**Scenario 2**: Token 2 completed (45 min), Token 3 in progress
```
avgConsultTime = (30+45)/2 = 37.5 minutes
currentConsultingToken = 3
currentTime = 7:45

ETA for T4 = 7:45 + ((4-3) * 37.5) = 8:22 ✅
ETA for T5 = 7:45 + ((5-3) * 37.5) = 9:00 ✅
```

**Scenario 3**: Token 3 completed (15 min), Token 4 in progress
```
avgConsultTime = (30+45+15)/3 = 30 minutes
currentConsultingToken = 4
currentTime = 8:00

ETA for T5 = 8:00 + ((5-4) * 30) = 8:30 ✅
```

---

## Implementation Timeline

### Week 1: Phase 1 (Schedule-Based ETA)
- [ ] Add ETA calculation utility functions
- [ ] Enhance appointment booking response  
- [ ] Create ETA display component
- [ ] Update patient booking confirmation
- [ ] Update patient dashboard display
- [ ] Test with various schedules and token numbers

### Week 2: Phase 2 (Doctor Arrival ETA)
- [ ] Enhance doctor arrival handler
- [ ] Add Stage 2 ETA calculation
- [ ] Update arrival notifications with ETA
- [ ] Enhance patient dashboard for arrival updates
- [ ] Test late/early doctor arrival scenarios

### Week 3: Phase 3 (Real-Time Moving Average)
- [ ] Database schema migration for timing fields
- [ ] Implement enhanced status update with timing
- [ ] Add moving average calculation system
- [ ] Create real-time ETA recalculation triggers
- [ ] Update frontend for live ETA display
- [ ] Test full system with multiple consultation completions

### Week 4: Integration & Polish
- [ ] End-to-end testing of all three stages
- [ ] Performance optimization for real-time updates
- [ ] Error handling and edge cases
- [ ] Documentation and user training

## Success Metrics

- **Accuracy**: ETA within ±10 minutes of actual appointment time
- **User Satisfaction**: Reduced patient anxiety about wait times  
- **System Performance**: No impact on existing appointment booking speed
- **Real-Time Updates**: ETA changes reflected within 30 seconds

## Error Handling & Edge Cases

### Common Edge Cases
1. **No consultation duration data**: Fallback to 15-minute default
2. **Doctor doesn't arrive**: Keep showing Stage 1 ETA
3. **Very long consultations**: Cap moving average calculation
4. **Network issues**: Cache last known ETA locally
5. **Multiple doctors same clinic**: Each doctor has independent moving average

### Error Recovery
- Graceful degradation if ETA calculation fails
- Fallback to simpler ETA methods if complex calculation errors
- Clear error messages for users when ETA unavailable
- Automatic retry for failed ETA updates

## Future Enhancements

1. **Weighted Moving Average**: Give more weight to recent consultations
2. **Machine Learning**: Predict consultation times based on appointment type
3. **Real-time Notifications**: Push notifications for significant ETA changes
4. **Doctor-specific Patterns**: Learn individual doctor consultation patterns
5. **Queue Optimization**: Suggest optimal appointment times based on historical data

---

## Technical Notes

### Performance Considerations
- Moving average calculations are lightweight (simple arithmetic)
- ETA updates triggered only on status changes, not continuously
- Frontend queries cached for 30 seconds to reduce server load
- Database indexes on consultation timing fields for fast queries

### Security Considerations
- ETA data only accessible to patient, doctor, or clinic staff
- No sensitive information exposed in ETA calculations
- Standard authentication/authorization applies to all ETA endpoints

### Scalability Considerations
- ETA calculations scale linearly with number of appointments
- Moving averages calculated per doctor-clinic-date (isolated scope)
- Real-time updates use existing 30-second refresh cycle
- No additional real-time connection requirements

This document provides a complete roadmap for implementing the 3-stage ETA system in ClinicFlow, with detailed code examples and testing scenarios for each phase.