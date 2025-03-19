import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage, type IStorage } from "./storage";
import { insertAppointmentSchema, insertAttenderDoctorSchema, type AttenderDoctor, type User } from "@shared/schema";
import { insertDoctorDetailSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/doctors", async (req, res) => {
    const { lat, lng, radius, specialty } = req.query;

    try {
      let doctors;
      if (lat && lng) {
        doctors = await storage.getDoctorsNearLocation(
          parseFloat(lat as string),
          parseFloat(lng as string),
          radius ? parseFloat(radius as string) : undefined
        );
      } else if (specialty) {
        doctors = await storage.getDoctorsBySpecialty(specialty as string);
      } else {
        doctors = await storage.getDoctors();
      }
      res.json(doctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      res.status(500).json({ message: 'Failed to fetch doctors' });
    }
  });

  app.get("/api/doctors/:id", async (req, res) => {
    try {
      const doctor = await storage.getDoctorWithClinic(parseInt(req.params.id));
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      res.json(doctor);
    } catch (error) {
      console.error('Error fetching doctor:', error);
      res.status(500).json({ message: 'Failed to fetch doctor' });
    }
  });

  app.get("/api/appointments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      // Route to specific endpoints based on user role
      if (req.user.role === "patient") {
        const appointments = await storage.getPatientAppointments(req.user.id);
        return res.json(appointments);
      } else if (req.user.role === "doctor") {
        const appointments = await storage.getAppointments(req.user.id);
        return res.json(appointments);
      } else if (req.user.role === "attender") {
        const doctorsWithAppointments = await storage.getAttenderDoctorsAppointments(req.user.id);
        return res.json(doctorsWithAppointments);
      }

      res.status(403).json({ message: 'Invalid role for appointments access' });
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const doctor = await storage.getUser(Number(req.body.doctorId));
      if (!doctor || !doctor.clinicId) {
        return res.status(400).json({ message: 'Invalid doctor or clinic' });
      }

      // Get the appointment date and extract day of week
      const appointmentDate = new Date(req.body.date);
      const dayOfWeek = appointmentDate.getDay();
      const clinicId = req.body.clinicId || doctor.clinicId;

      // Get the doctor's schedule for this day and clinic
      const schedules = await storage.getDoctorSchedules(Number(req.body.doctorId));
      const schedule = schedules.find(s => 
        s.clinicId === clinicId && 
        s.dayOfWeek === dayOfWeek && 
        s.isActive
      );

      if (!schedule) {
        return res.status(400).json({ message: 'No active schedule found for this doctor on the selected day' });
      }

      // Get current token count for this date
      const startOfDay = new Date(appointmentDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(appointmentDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const appointments = await storage.getAppointmentCountForDoctor(
        Number(req.body.doctorId),
        clinicId,
        startOfDay,
        endOfDay
      );
      
      // Check if token limit has been reached
      if (schedule.maxTokens !== null && schedule.maxTokens !== undefined && appointments >= schedule.maxTokens) {
        return res.status(400).json({ 
          message: `Maximum number of tokens (${schedule.maxTokens}) has been reached for this schedule` 
        });
      }

      const appointmentData = {
        ...req.body,
        patientId: req.user.id,
        clinicId,
        date: appointmentDate,
        tokenNumber: req.body.tokenNumber
      };

      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      console.error('Error creating appointment:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid appointment data' });
    }
  });

  app.patch("/api/appointments/:id/status", async (req, res) => {
    if (!req.user || req.user.role !== "attender") return res.sendStatus(403);
    try {
      const appointmentId = parseInt(req.params.id);
      const { status, statusNotes } = req.body;

      const allowedStatuses = ["scheduled", "start", "hold", "pause", "cancel", "completed"];
      
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ 
          error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` 
        });
      }

      // Update the appointment status
      const updatedAppointment = await storage.updateAppointmentStatus(
        appointmentId, 
        status as any, 
        statusNotes
      );
      res.json(updatedAppointment);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      res.status(500).json({ message: 'Failed to update appointment status' });
    }
  });

  // Doctor specific routes
  app.get("/api/doctor/appointments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role !== "doctor") return res.sendStatus(403);

    try {
      const appointments = await storage.getAppointments(req.user.id);
      res.json(appointments);
    } catch (error) {
      console.error('Error fetching doctor appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  app.patch("/api/doctors/:id/availability", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role !== "doctor" && req.user.role !== "attender") return res.sendStatus(403);
    if (req.user.role === "doctor" && req.user.id !== parseInt(req.params.id)) return res.sendStatus(403);

    try {
      const doctorId = parseInt(req.params.id);
      const { isAvailable, date } = req.body;

      const availability = await storage.updateDoctorAvailability(
        doctorId,
        new Date(date),
        isAvailable
      );
      res.json(availability);
    } catch (error) {
      console.error('Error updating doctor availability:', error);
      res.status(500).json({ message: 'Failed to update doctor availability' });
    }
  });

  app.get("/api/doctors/availability", async (req, res) => {
    try {
      const doctorIds = (req.query.doctorIds as string || "").split(",").map(Number);
      const date = new Date();

      const availabilities = await Promise.all(
        doctorIds.map(doctorId => storage.getDoctorAvailability(doctorId, date))
      );

      res.json(availabilities.filter(Boolean));
    } catch (error) {
      console.error('Error fetching doctor availabilities:', error);
      res.status(500).json({ message: 'Failed to fetch doctor availabilities' });
    }
  });


  // Patient appointments route
  app.get("/api/patient/appointments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role !== "patient") return res.sendStatus(403);

    try {
      const appointments = await storage.getPatientAppointments(req.user.id);
      res.json(appointments);
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  // Attender appointments route - Single endpoint for attender appointments
  app.get("/api/attender/:id/doctors/appointments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role !== "attender") return res.sendStatus(403);

    try {
      const doctorsWithAppointments = await storage.getAttenderDoctorsAppointments(parseInt(req.params.id));
      res.json(doctorsWithAppointments);
    } catch (error) {
      console.error('Error fetching attender doctor appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  app.get("/api/doctors/:id/availability", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      // Round date to start of day for consistency
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const availability = await storage.getDoctorAvailability(doctorId, startOfDay);

      // If no availability record exists, return a default structure
      if (!availability) {
        return res.json({
          doctorId,
          date: startOfDay.toISOString(),
          isAvailable: true, // Default to true since we're not using this for slot management
          currentToken: 0
        });
      }

      res.json(availability);
    } catch (error) {
      console.error('Error fetching doctor availability:', error);
      res.status(500).json({ message: 'Failed to fetch doctor availability' });
    }
  });

  // Token progress endpoint for patients to check their position in queue
  app.get("/api/doctors/:id/token-progress", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      const { clinicId } = req.query;
      
      if (!clinicId) {
        return res.status(400).json({ message: 'clinicId is required' });
      }
      
      const progress = await storage.getCurrentTokenProgress(
        doctorId, 
        parseInt(clinicId as string), 
        new Date()
      );
      
      // Get the current date
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Count walk-in patients ahead for registered patients
      let walkInPatients = 0;
      
      if (req.user && req.user.role === "patient") {
        // Get the patient's appointment
        const patientAppointments = await storage.getPatientAppointments(req.user.id);
        const todayAppointment = patientAppointments.find(apt => 
          apt.doctorId === doctorId && 
          apt.clinicId === parseInt(clinicId as string) &&
          new Date(apt.date) >= startOfDay &&
          new Date(apt.date) <= endOfDay
        );
        
        if (todayAppointment) {
          // Count walk-in patients with token numbers between current token and patient's token
          walkInPatients = await storage.countWalkInPatientsAhead(
            doctorId,
            parseInt(clinicId as string),
            progress.currentToken,
            todayAppointment.tokenNumber
          );
        }
      }
      
      // Add walk-in count to the response
      res.json({
        ...progress,
        walkInPatients
      });
    } catch (error) {
      console.error('Error fetching token progress:', error);
      res.status(500).json({ message: 'Failed to fetch token progress' });
    }
  });

  // Update token progress (Attender only)
  app.patch("/api/doctors/:id/token-progress", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role !== "attender") return res.sendStatus(403);

    try {
      const doctorId = parseInt(req.params.id);
      const { currentToken, clinicId, date } = req.body;

      // Validate that this attender can manage this doctor
      const attenderDoctors = await storage.getAttenderDoctors(req.user.id);
      const canManageDoctor = attenderDoctors.some((ad: AttenderDoctor & { doctor: User }) => ad.doctor.id === doctorId);
      
      if (!canManageDoctor) {
        return res.status(403).json({ message: 'Not authorized to manage this doctor' });
      }

      // This endpoint is deprecated - token progress is now calculated from appointments
      res.status(410).json({ 
        message: 'This endpoint is deprecated. Token progress is now calculated from appointments.',
        info: 'Use the GET /api/doctors/:id/token-progress endpoint to get the current token progress.'
      });
    } catch (error) {
      console.error('Error updating token progress:', error);
      res.status(500).json({ message: 'Failed to update token progress' });
    }
  });

  // Doctor management routes
  app.post("/api/doctors", async (req, res) => {
    try {
      // Check if user is authorized (must be hospital_admin or attender)
      if (!req.user || (req.user.role !== "hospital_admin" && req.user.role !== "attender")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Validate request body
      const doctorSchema = z.object({
        user: z.object({
          name: z.string(),
          username: z.string(),
          password: z.string(),
          specialty: z.string(),
          bio: z.string().optional(),
          imageUrl: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          latitude: z.string().optional(),
          longitude: z.string().optional(),
          clinicId: z.number(),
        }),
        details: z.object({
          consultationFee: z.number().or(z.string().transform(val => parseFloat(val))),
          consultationDuration: z.number().or(z.string().transform(val => parseInt(val))),
          qualifications: z.string().optional(),
          experience: z.number().optional().or(z.string().transform(val => parseInt(val))),
          registrationNumber: z.string().optional(),
          isEnabled: z.boolean().optional(),
        }),
      });

      const validatedData = doctorSchema.parse(req.body);

      // Create the doctor with role explicitly set
      const doctor = await storage.createDoctor(
        {
          name: validatedData.user.name,
          username: validatedData.user.username,
          password: validatedData.user.password,
          specialty: validatedData.user.specialty,
          bio: validatedData.user.bio,
          imageUrl: validatedData.user.imageUrl,
          address: validatedData.user.address,
          city: validatedData.user.city,
          state: validatedData.user.state,
          zipCode: validatedData.user.zipCode,
          latitude: validatedData.user.latitude,
          longitude: validatedData.user.longitude,
          clinicId: validatedData.user.clinicId,
        },
        validatedData.details
      );

      res.status(201).json(doctor);
    } catch (error) {
      console.error("Error creating doctor:", error);
      res.status(500).json({ message: "Failed to create doctor" });
    }
  });

  // Get doctor details
  app.get("/api/doctors/:id/details", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      
      // Get doctor details
      const details = await storage.getDoctorDetails(doctorId);
      
      if (!details) {
        return res.status(404).json({ message: "Doctor details not found" });
      }
      
      res.json(details);
    } catch (error) {
      console.error("Error fetching doctor details:", error);
      res.status(500).json({ message: "Failed to fetch doctor details" });
    }
  });

  // Update doctor details
  app.patch("/api/doctors/:id/details", async (req, res) => {
    try {
      // Check if user is authorized (must be hospital_admin or attender)
      if (!req.user || (req.user.role !== "hospital_admin" && req.user.role !== "attender")) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const doctorId = parseInt(req.params.id);
      
      // Validate request body
      const updateSchema = z.object({
        consultationFee: z.number().or(z.string().transform(val => parseFloat(val))).optional(),
        consultationDuration: z.number().optional(),
        qualifications: z.string().optional(),
        experience: z.number().optional(),
        registrationNumber: z.string().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Update doctor details
      const updatedDetails = await storage.updateDoctorDetails(doctorId, validatedData);
      
      res.json(updatedDetails);
    } catch (error) {
      console.error("Error updating doctor details:", error);
      res.status(500).json({ message: "Failed to update doctor details" });
    }
  });

  // Toggle doctor status (enable/disable)
  app.patch("/api/doctors/:id/status", async (req, res) => {
    try {
      // Check if user is authorized (must be hospital_admin or attender)
      if (!req.user || (req.user.role !== "hospital_admin" && req.user.role !== "attender")) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const doctorId = parseInt(req.params.id);
      
      // Validate request body
      const statusSchema = z.object({
        isEnabled: z.boolean(),
      });
      
      const { isEnabled } = statusSchema.parse(req.body);
      
      // Toggle doctor status
      const updatedDetails = await storage.toggleDoctorStatus(doctorId, isEnabled);
      
      res.json(updatedDetails);
    } catch (error) {
      console.error("Error toggling doctor status:", error);
      res.status(500).json({ message: "Failed to toggle doctor status" });
    }
  });

  // Get all clinics
  app.get("/api/clinics", async (req, res) => {
    try {
      const clinics = await storage.getClinics();
      res.json(clinics);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      res.status(500).json({ message: 'Failed to fetch clinics' });
    }
  });

  // Doctor schedule routes
  app.get("/api/doctors/:id/schedules", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: 'Invalid doctor ID' });
      }

      // Get the doctor's schedules
      const schedules = await storage.getDoctorSchedules(doctorId);
      
      // Apply filtering if query params are present
      let filteredSchedules = [...schedules];
      
      // Filter by day of week if provided
      if (req.query.day !== undefined) {
        const dayOfWeek = parseInt(req.query.day as string);
        if (!isNaN(dayOfWeek)) {
          filteredSchedules = filteredSchedules.filter(s => s.dayOfWeek === dayOfWeek);
        }
      }
      
      // Filter by clinic ID if provided
      if (req.query.clinicId !== undefined) {
        const clinicId = parseInt(req.query.clinicId as string);
        if (!isNaN(clinicId)) {
          filteredSchedules = filteredSchedules.filter(s => s.clinicId === clinicId);
        }
      }
      
      res.json(filteredSchedules);
    } catch (error) {
      console.error('Error fetching doctor schedules:', error);
      res.status(500).json({ message: 'Failed to fetch doctor schedules' });
    }
  });

  app.post("/api/doctors/:id/schedules", async (req, res) => {
    if (!req.user || !['hospital_admin', 'attender'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    try {
      const doctorId = parseInt(req.params.id);
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: 'Invalid doctor ID' });
      }

      // Validate the schedule data
      const scheduleSchema = z.object({
        clinicId: z.number(),
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        isActive: z.boolean().optional().default(true),
        maxTokens: z.number().min(1).default(20),
      });

      const validData = scheduleSchema.parse(req.body);
      
      // Check if the doctor exists
      const doctor = await storage.getUser(doctorId);
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      // Create the schedule
      const schedule = await storage.createDoctorSchedule({
        doctorId,
        ...validData,
      });

      res.status(201).json(schedule);
    } catch (error) {
      console.error('Error creating doctor schedule:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid schedule data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create doctor schedule' });
    }
  });

  app.patch("/api/doctors/schedules/:id", async (req, res) => {
    if (!req.user || !['hospital_admin', 'attender'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    try {
      const scheduleId = parseInt(req.params.id);
      if (isNaN(scheduleId)) {
        return res.status(400).json({ message: 'Invalid schedule ID' });
      }

      // Validate the schedule data
      const scheduleSchema = z.object({
        clinicId: z.number().optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
        endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
        isActive: z.boolean().optional(),
        maxTokens: z.number().min(1).optional(),
      });

      const validData = scheduleSchema.parse(req.body);
      
      // Update the schedule
      const schedule = await storage.updateDoctorSchedule(scheduleId, validData);
      res.json(schedule);
    } catch (error) {
      console.error('Error updating doctor schedule:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid schedule data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update doctor schedule' });
    }
  });

  app.delete("/api/doctors/schedules/:id", async (req, res) => {
    if (!req.user || !['hospital_admin', 'attender'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    try {
      const scheduleId = parseInt(req.params.id);
      if (isNaN(scheduleId)) {
        return res.status(400).json({ message: 'Invalid schedule ID' });
      }

      await storage.deleteDoctorSchedule(scheduleId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting doctor schedule:', error);
      res.status(500).json({ message: 'Failed to delete doctor schedule' });
    }
  });

  // Get available doctors by clinic, day, and time
  app.get("/api/clinics/:clinicId/available-doctors", async (req, res) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const { day, time } = req.query;
      
      if (isNaN(clinicId)) {
        return res.status(400).json({ message: 'Invalid clinic ID' });
      }
      
      if (!day || typeof day !== 'string' || !time || typeof time !== 'string') {
        return res.status(400).json({ message: 'Day and time parameters are required' });
      }
      
      const dayNum = parseInt(day);
      if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
        return res.status(400).json({ message: 'Day must be a number between 0 (Sunday) and 6 (Saturday)' });
      }
      
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
        return res.status(400).json({ message: 'Time must be in format HH:MM in 24-hour format' });
      }
      
      const doctors = await storage.getAvailableDoctors(clinicId, dayNum, time);
      res.json(doctors);
    } catch (error) {
      console.error('Error fetching available doctors:', error);
      res.status(500).json({ message: 'Failed to fetch available doctors' });
    }
  });

  // Get schedules by clinic
  app.get("/api/clinics/:clinicId/schedules", async (req, res) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      if (isNaN(clinicId)) {
        return res.status(400).json({ message: 'Invalid clinic ID' });
      }

      const schedules = await storage.getDoctorSchedulesByClinic(clinicId);
      res.json(schedules);
    } catch (error) {
      console.error('Error fetching clinic schedules:', error);
      res.status(500).json({ message: 'Failed to fetch clinic schedules' });
    }
  });

  // Get available time slots for a doctor on a specific date
  app.get("/api/doctors/:id/available-slots", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      if (isNaN(doctorId)) {
        return res.status(400).json({ message: 'Invalid doctor ID' });
      }

      // Get date from query parameter or use current date
      const dateParam = req.query.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      
      // Validate the date
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const result = await storage.getDoctorAvailableTimeSlots(doctorId, date);
      res.json(result);
    } catch (error) {
      console.error('Error fetching available time slots:', error);
      res.status(500).json({ message: 'Failed to fetch available time slots' });
    }
  });

  // Add a new endpoint for doctor arrival status
  app.patch("/api/doctors/:id/arrival", async (req, res) => {
    if (!req.user || req.user.role !== "attender") return res.sendStatus(403);
    
    try {
      const doctorId = parseInt(req.params.id);
      const { hasArrived, clinicId, scheduleId, date } = req.body;
      
      if (hasArrived === undefined || !clinicId || !date) {
        return res.status(400).json({ 
          message: 'Missing required fields: hasArrived, clinicId, and date are required' 
        });
      }
      
      const parsedScheduleId = scheduleId ? parseInt(scheduleId) : null;
      
      const presenceRecord = await storage.updateDoctorArrivalStatus(
        doctorId,
        parseInt(clinicId),
        parsedScheduleId,
        new Date(date),
        hasArrived
      );
      
      res.json(presenceRecord);
    } catch (error) {
      console.error('Error updating doctor arrival status:', error);
      res.status(500).json({ message: 'Failed to update doctor arrival status' });
    }
  });
  
  // Add an endpoint to get doctor arrival status
  app.get("/api/doctors/:id/arrival", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      const { clinicId, date } = req.query;
      
      if (!clinicId || !date) {
        return res.status(400).json({ 
          message: 'Missing required query parameters: clinicId and date' 
        });
      }
      
      const presenceRecord = await storage.getDoctorArrivalStatus(
        doctorId,
        parseInt(clinicId as string),
        new Date(date as string)
      );
      
      if (!presenceRecord) {
        return res.json({
          doctorId,
          clinicId: parseInt(clinicId as string),
          date: new Date(date as string).toISOString(),
          hasArrived: false,
          scheduleId: null
        });
      }
      
      res.json(presenceRecord);
    } catch (error) {
      console.error('Error fetching doctor arrival status:', error);
      res.status(500).json({ message: 'Failed to fetch doctor arrival status' });
    }
  });

  // Add a new endpoint for attenders to create walk-in appointments
  app.post("/api/attender/walk-in-appointments", async (req, res) => {
    if (!req.user || req.user.role !== "attender") return res.sendStatus(403);
    
    try {
      const { doctorId, clinicId, scheduleId, date, guestName, guestPhone } = req.body;
      
      // Validate required fields
      if (!doctorId || !clinicId || !date || !guestName) {
        return res.status(400).json({ 
          message: 'Missing required fields: doctorId, clinicId, date, and guestName are required' 
        });
      }
      
      // Validate the doctor exists and is managed by this attender
      const managedDoctors = await storage.getAttenderDoctors(req.user.id);
      const canManageDoctor = managedDoctors.some(md => md.doctorId === Number(doctorId));
      
      if (!canManageDoctor) {
        return res.status(403).json({ message: 'You are not authorized to manage this doctor' });
      }
      
      // Create appointment date object
      const appointmentDate = new Date(date);
      
      // Create the walk-in appointment
      const appointmentData = {
        doctorId: Number(doctorId),
        clinicId: Number(clinicId),
        scheduleId: scheduleId ? Number(scheduleId) : undefined,
        date: appointmentDate,
        guestName,
        guestPhone,
        isWalkIn: true,
        status: "scheduled"
      };
      
      const appointment = await storage.createWalkInAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      console.error('Error creating walk-in appointment:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Invalid appointment data' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}