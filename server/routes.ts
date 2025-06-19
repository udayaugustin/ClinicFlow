import express, { Express } from 'express';
import { createServer, Server } from 'http';
import cors from 'cors';
import { storage, getTokens } from './storage';
import { createSessionMiddleware, setupAuth } from './auth';
import { insertAppointmentSchema, insertAttenderDoctorSchema, insertClinicSchema, insertUserSchema, type AttenderDoctor, type User } from "../shared/schema";
import { insertDoctorDetailSchema } from "../shared/schema";
import { z } from "zod";
import { notificationService } from './services/notification';

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
  
  app.get("/api/doctors/:id/clinics", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      const clinics = await storage.getDoctorClinics(doctorId);
      res.json(clinics);
    } catch (error) {
      console.error('Error fetching doctor clinics:', error);
      res.status(500).json({ message: 'Failed to fetch doctor clinics' });
    }
  });
  
  app.get("/api/clinics/:id/doctors", async (req, res) => {
    try {
      const clinicId = parseInt(req.params.id);
      const doctors = await storage.getDoctorsByClinic(clinicId);
      res.json(doctors);
    } catch (error) {
      console.error('Error fetching clinic doctors:', error);
      res.status(500).json({ message: 'Failed to fetch clinic doctors' });
    }
  });

  app.post("/api/doctors", async (req, res) => {
    if (!req.user || (req.user.role !== "super_admin" && req.user.role !== "clinic_admin")) {
      return res.sendStatus(403);
    }
    try {
      const { clinicIds, ...doctorData } = req.body;
      
      // Add default phone if not provided
      const doctorDataWithDefaults = {
        ...doctorData,
        phone: doctorData.phone || '0000000000', // Default phone number if not provided
        role: "doctor"
      };
      
      const userData = insertUserSchema.parse(doctorDataWithDefaults);
      
      const doctor = await storage.createUser(userData);
      
      // Add doctor to clinics if provided
      if (clinicIds && Array.isArray(clinicIds) && clinicIds.length > 0) {
        await storage.updateDoctorClinics(doctor.id, clinicIds);
      }
      
      res.status(201).json(doctor);
    } catch (error) {
      console.error('Error creating doctor:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid doctor data' });
    }
  });

  app.put("/api/doctors/:id", async (req, res) => {
    if (!req.user || (req.user.role !== "super_admin" && req.user.role !== "clinic_admin")) return res.sendStatus(403);
    try {
      const doctorId = parseInt(req.params.id);
      const doctor = await storage.getUser(doctorId);
      
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      
      const { clinicIds, ...updateData } = req.body;
      
      const updatedDoctor = await storage.updateUser(doctorId, updateData);
      
      // Update doctor clinics if provided
      if (clinicIds && Array.isArray(clinicIds)) {
        await storage.updateDoctorClinics(doctorId, clinicIds);
      }
      
      res.json(updatedDoctor);
    } catch (error) {
      console.error('Error updating doctor:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid doctor data' });
    }
  });

  app.delete("/api/doctors/:id", async (req, res) => {
    if (!req.user || (req.user.role !== "super_admin" && req.user.role !== "clinic_admin")) return res.sendStatus(403);
    try {
      const doctorId = parseInt(req.params.id);
      const doctor = await storage.getUser(doctorId);
      
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      
      await storage.deleteUser(doctorId);
      res.status(200).json({ message: 'Doctor deleted successfully' });
    } catch (error) {
      console.error('Error deleting doctor:', error);
      res.status(500).json({ message: 'Failed to delete doctor' });
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

      // Get the appointment date
      const appointmentDate = new Date(req.body.date);
      const clinicId = req.body.clinicId || doctor.clinicId;

      // Get the specific schedule for this appointment
      const schedule = await storage.getSpecificSchedule(
        Number(req.body.doctorId),
        clinicId,
        Number(req.body.scheduleId),
        appointmentDate
      );

      if (!schedule) {
        return res.status(400).json({ message: 'Invalid or inactive schedule for this appointment' });
      }

      // Get current token count for this date
      const appointments = await storage.getAppointmentCountForDoctor(
        Number(req.body.doctorId),
        clinicId,
        schedule.id
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
        tokenNumber: req.body.tokenNumber,
        scheduleId: schedule.id
      };

      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      console.error('Error creating appointment:', error);
      res.status(500).json({ message: 'Failed to create appointment' });
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
      
      // Generate notification for the status change - wrapped in try/catch
      try {
        if (updatedAppointment.patientId) { // Only notify registered patients
          await notificationService.generateStatusNotification(updatedAppointment, status, statusNotes);
        }
        
        // If the appointment status is "start", notify the next patients
        if (status === "start") {
          await notificationService.notifyNextPatients(updatedAppointment);
        }
      } catch (notificationError) {
        // Log the error but don't fail the request
        console.error('Error sending notifications:', notificationError);
      }
      
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

  // Attender routes
  app.get("/api/attenders", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      let attenders;
      if (req.query.clinicId) {
        attenders = await storage.getAttendersByClinic(parseInt(req.query.clinicId as string));
      } else {
        attenders = await storage.getAttendersByRole();
      }
      res.json(attenders);
    } catch (error) {
      console.error('Error fetching attenders:', error);
      res.status(500).json({ message: 'Failed to fetch attenders' });
    }
  });

  app.get("/api/attenders/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const attender = await storage.getUser(parseInt(req.params.id));
      if (!attender || attender.role !== 'attender') {
        return res.status(404).json({ message: 'Attender not found' });
      }
      res.json(attender);
    } catch (error) {
      console.error('Error fetching attender:', error);
      res.status(500).json({ message: 'Failed to fetch attender' });
    }
  });

  app.post("/api/attenders", async (req, res) => {
    if (!req.user || (req.user.role !== "super_admin" && req.user.role !== "doctor" && req.user.role !== "clinic_admin")) {
      return res.sendStatus(403);
    }
    try {
      const userData = insertUserSchema.parse({
        ...req.body,
        role: "attender"
      });
      
      const attender = await storage.createUser(userData);
      res.status(201).json(attender);
    } catch (error) {
      console.error('Error creating attender:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid attender data' });
    }
  });

  app.put("/api/attenders/:id", async (req, res) => {
    if (!req.user || (req.user.role !== "super_admin" && req.user.role !== "doctor" && req.user.role !== "clinic_admin")) {
      return res.sendStatus(403);
    }
    try {
      const attenderId = parseInt(req.params.id);
      const attender = await storage.getUser(attenderId);
      
      if (!attender || attender.role !== 'attender') {
        return res.status(404).json({ message: 'Attender not found' });
      }
      
      const updatedAttender = await storage.updateUser(attenderId, req.body);
      res.json(updatedAttender);
    } catch (error) {
      console.error('Error updating attender:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid attender data' });
    }
  });

  app.delete("/api/attenders/:id", async (req, res) => {
    if (!req.user || (req.user.role !== "super_admin" && req.user.role !== "doctor" && req.user.role !== "clinic_admin")) {
      return res.sendStatus(403);
    }
    try {
      const attenderId = parseInt(req.params.id);
      const attender = await storage.getUser(attenderId);
      
      if (!attender || attender.role !== 'attender') {
        return res.status(404).json({ message: 'Attender not found' });
      }
      
      await storage.deleteUser(attenderId);
      res.status(200).json({ message: 'Attender deleted successfully' });
    } catch (error) {
      console.error('Error deleting attender:', error);
      res.status(500).json({ message: 'Failed to delete attender' });
    }
  });

  // Clinic routes
  app.get("/api/clinics", async (req, res) => {
    try {
      const clinics = await storage.getClinics();
      res.json(clinics);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      res.status(500).json({ message: 'Failed to fetch clinics' });
    }
  });

  app.get("/api/clinics/:id", async (req, res) => {
    try {
      const clinicId = parseInt(req.params.id);
      const clinic = await storage.getClinic(clinicId);
      
      if (!clinic) {
        return res.status(404).json({ message: 'Clinic not found' });
      }
      
      res.json(clinic);
    } catch (error) {
      console.error('Error fetching clinic:', error);
      res.status(500).json({ message: 'Failed to fetch clinic' });
    }
  });

  app.post("/api/clinics", async (req, res) => {
    if (!req.user || req.user.role !== "super_admin") return res.sendStatus(403);
    try {
      const clinicData = insertClinicSchema.parse(req.body);
      const clinic = await storage.createClinic(clinicData);
      res.status(201).json(clinic);
    } catch (error) {
      console.error('Error creating clinic:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid clinic data' });
    }
  });

  app.put("/api/clinics/:id", async (req, res) => {
    if (!req.user || req.user.role !== "super_admin") return res.sendStatus(403);
    try {
      const clinicId = parseInt(req.params.id);
      const clinic = await storage.getClinic(clinicId);
      
      if (!clinic) {
        return res.status(404).json({ message: 'Clinic not found' });
      }
      
      const updatedClinic = await storage.updateClinic(clinicId, req.body);
      res.json(updatedClinic);
    } catch (error) {
      console.error('Error updating clinic:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid clinic data' });
    }
  });

  app.delete("/api/clinics/:id", async (req, res) => {
    if (!req.user || req.user.role !== "super_admin") return res.sendStatus(403);
    try {
      const clinicId = parseInt(req.params.id);
      const clinic = await storage.getClinic(clinicId);
      
      if (!clinic) {
        return res.status(404).json({ message: 'Clinic not found' });
      }
      
      await storage.deleteClinic(clinicId);
      res.status(200).json({ message: 'Clinic deleted successfully' });
    } catch (error) {
      console.error('Error deleting clinic:', error);
      res.status(500).json({ message: 'Failed to delete clinic' });
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

  app.get("/api/clinics/:id", async (req, res) => {
    try {
      const clinicId = parseInt(req.params.id);
      if (isNaN(clinicId)) {
        return res.status(400).json({ message: 'Invalid clinic ID' });
      }
      const clinic = await storage.getClinic(clinicId);
      if (!clinic) {
        return res.status(404).json({ message: 'Clinic not found' });
      }
      res.json(clinic);
    } catch (error) {
      console.error('Error fetching clinic:', error);
      res.status(500).json({ message: 'Failed to fetch clinic' });
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
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const schedules = await storage.getDoctorSchedules(doctorId, date);
      
      // Filter by clinic ID if provided
      let filteredSchedules = [...schedules];
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

  // Schedule pause routes
  app.patch("/api/schedules/:id/pause", async (req, res) => {
    if (!req.user || !['hospital_admin', 'attender', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    try {
      const scheduleId = parseInt(req.params.id);
      const { isPaused, pauseReason, date } = req.body;

      if (isNaN(scheduleId)) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      await storage.pauseSchedule(scheduleId, pauseReason, new Date(date));

      // Get all appointments for this schedule that are scheduled or in progress
      const appointments = await storage.getAppointmentsBySchedule(scheduleId);
      const affectedAppointments = appointments.filter(apt => 
        ["scheduled", "start"].includes(apt.status || "")
      );

      // Update all affected appointments to paused status
      for (const appointment of affectedAppointments) {
        // Update the appointment status to "pause"
        await storage.updateAppointmentStatus(appointment.id, "pause", pauseReason || "Schedule paused");
        
        if (appointment.patientId) {
          await notificationService.createNotification({
            userId: appointment.patientId,
            appointmentId: appointment.id,
            title: "Schedule Paused",
            message: `Your appointment has been temporarily paused. Reason: ${pauseReason}`,
            type: "schedule_paused"
          });
        }
      }

      res.json({ message: "Schedule paused successfully" });
    } catch (error) {
      console.error("Error pausing schedule:", error);
      res.status(500).json({ error: "Failed to pause schedule" });
    }
  });

  app.patch("/api/schedules/:id/resume", async (req, res) => {
    if (!req.user || !['hospital_admin', 'attender', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }
    try {
      const scheduleId = parseInt(req.params.id);
      await storage.resumeSchedule(scheduleId);

      // Get all appointments for this schedule that are in paused status
      const appointments = await storage.getAppointmentsBySchedule(scheduleId);
      const affectedAppointments = appointments.filter(apt => 
        apt.status === "pause"
      );

      // Update all paused appointments back to scheduled status
      for (const appointment of affectedAppointments) {
        // Update the appointment status back to "scheduled"
        await storage.updateAppointmentStatus(appointment.id, "scheduled", "Schedule resumed");
        
        if (appointment.patientId) {
          await notificationService.createNotification({
            userId: appointment.patientId,
            appointmentId: appointment.id,
            title: "Schedule Resumed",
            message: "The doctor's schedule has resumed. Your appointment will proceed as planned.",
            type: "schedule_resumed"
          });
        }
      }

      res.json({ message: "Schedule resumed successfully" });
    } catch (error) {
      console.error("Error resuming schedule:", error);
      res.status(500).json({ error: "Failed to resume schedule" });
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
        date: z.string().transform(str => new Date(str)), // Accept ISO date string
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

      // Check for overlapping schedules on the same date
      const existingSchedules = await storage.getDoctorSchedules(doctorId);
      const overlappingSchedule = existingSchedules.find(schedule => {
        const scheduleDate = new Date(schedule.date);
        const newDate = new Date(validData.date);
        
        // Check if dates match
        if (scheduleDate.toDateString() !== newDate.toDateString()) {
          return false;
        }

        // Convert times to minutes for easier comparison
        const getMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const existingStart = getMinutes(schedule.startTime);
        const existingEnd = getMinutes(schedule.endTime);
        const newStart = getMinutes(validData.startTime);
        const newEnd = getMinutes(validData.endTime);

        // Check for overlap
        return (
          (newStart >= existingStart && newStart < existingEnd) || // New start time falls within existing schedule
          (newEnd > existingStart && newEnd <= existingEnd) || // New end time falls within existing schedule
          (newStart <= existingStart && newEnd >= existingEnd) // New schedule completely encompasses existing schedule
        );
      });

      if (overlappingSchedule) {
        return res.status(400).json({ 
          message: 'Schedule overlaps with an existing schedule for this date' 
        });
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

      // Validate the update data
      const updateSchema = z.object({
        date: z.string().transform(str => new Date(str)).optional(),
        startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
        endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
        isActive: z.boolean().optional(),
        maxTokens: z.number().min(1).optional(),
      });

      const validData = updateSchema.parse(req.body);

      // Update the schedule
      const schedule = await storage.updateDoctorSchedule(scheduleId, validData);
      if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
      }

      res.json(schedule);
    } catch (error) {
      console.error('Error updating doctor schedule:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid update data', errors: error.errors });
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

  // Get available doctors by clinic and time
  app.get("/api/clinics/:clinicId/available-doctors", async (req, res) => {
    try {
      const clinicId = parseInt(req.params.clinicId);
      const { date, time } = req.query;
      
      if (isNaN(clinicId)) {
        return res.status(400).json({ message: 'Invalid clinic ID' });
      }
      
      if (!date || typeof date !== 'string' || !time || typeof time !== 'string') {
        return res.status(400).json({ message: 'Date and time parameters are required' });
      }
      
      const scheduleDate = new Date(date);
      if (isNaN(scheduleDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
        return res.status(400).json({ message: 'Time must be in format HH:MM in 24-hour format' });
      }
      
      const doctors = await storage.getAvailableDoctors(clinicId, scheduleDate, time);
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
      console.log('Fetching available slots for doctor:', doctorId);
      
      if (isNaN(doctorId)) {
        console.log('Invalid doctor ID:', req.params.id);
        return res.status(400).json({ message: 'Invalid doctor ID' });
      }

      // Get date from query parameter or use current date
      const dateParam = req.query.date as string;
      const date = dateParam ? new Date(dateParam) : new Date();
      console.log('Using date:', date);
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.log('Invalid date format:', dateParam);
        return res.status(400).json({ message: 'Invalid date format' });
      }

      // First check if doctor exists
      const doctor = await storage.getUser(doctorId);
      if (!doctor) {
        console.log('Doctor not found:', doctorId);
        return res.status(404).json({ message: 'Doctor not found' });
      }
      if (doctor.role !== 'doctor') {
        console.log('User is not a doctor:', doctor.role);
        return res.status(400).json({ message: 'User is not a doctor' });
      }

      console.log('Fetching available time slots for doctor:', doctorId, 'on date:', date);
      const result = await storage.getDoctorAvailableTimeSlots(doctorId, date);
      console.log('Available slots result:', JSON.stringify(result, null, 2));
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
      
      console.log('Doctor arrival update request:', { doctorId, hasArrived, clinicId, scheduleId, date });
      
      if (hasArrived === undefined || !clinicId || !date) {
        return res.status(400).json({ 
          message: 'Missing required fields: hasArrived, clinicId, and date are required' 
        });
      }
      
      const parsedScheduleId = scheduleId ? parseInt(scheduleId) : null;
      const dateObj = new Date(date);
      
      console.log('Updating doctor arrival status in storage');
      const presenceRecord = await storage.updateDoctorArrivalStatus(
        doctorId,
        parseInt(clinicId),
        parsedScheduleId,
        dateObj,
        hasArrived
      );
      console.log('Doctor presence record updated:', presenceRecord);
      
      // Send notifications to patients if the doctor has arrived
      if (hasArrived) {
        console.log('Doctor has arrived, sending notifications to patients');
        try {
          await notificationService.notifyDoctorArrival(
            doctorId,
            parseInt(clinicId),
            dateObj,
            parsedScheduleId
          );
          console.log(`Successfully sent arrival notifications for doctor ${doctorId}`);
        } catch (notificationError) {
          console.error('Error sending doctor arrival notifications:', notificationError);
          // Continue execution - don't fail the API call if notifications fail
        }
      } else {
        console.log('Doctor marked as not arrived, skipping notifications');
      }
      
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

  // Notification Endpoints

  // Get unread notifications for the authenticated user
  app.get('/api/notifications', async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const notifications = await notificationService.getUnreadNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get all notifications for the authenticated user
  app.get('/api/notifications/all', async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const notifications = await notificationService.getAllNotifications(req.user.id, limit, offset);
      res.json(notifications);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Mark a notification as read
  app.patch('/api/notifications/:id/read', async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const notification = await notificationService.markAsRead(parseInt(req.params.id));
      res.json(notification);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/read-all', async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const result = await notificationService.markAllAsRead(req.user.id);
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Delete a notification
  app.delete('/api/notifications/:id', async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const result = await notificationService.deleteNotification(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Attender Dashboard Endpoints
  app.get('/api/attender/:id/clinic-overview', async (req, res) => {
    if (!req.user || req.user.role !== 'attender') return res.sendStatus(403);
    try {
      const attenderId = parseInt(req.params.id);
      if (req.user.id !== attenderId) return res.sendStatus(403);

      const overview = await storage.getAttenderClinicOverview(attenderId);
      res.json(overview);
    } catch (error) {
      console.error('Error fetching clinic overview:', error);
      res.status(500).json({ message: 'Failed to fetch clinic overview' });
    }
  });

  app.get('/api/attender/:id/doctors-summary', async (req, res) => {
    console.log('Doctors summary request:', { user: req.user, params: req.params });
    if (!req.user || req.user.role !== 'attender') {
      console.log('Auth failed:', { user: req.user?.role });
      return res.sendStatus(403);
    }
    try {
      const attenderId = parseInt(req.params.id);
      if (req.user.id !== attenderId) {
        console.log('ID mismatch:', { userId: req.user.id, attenderId });
        return res.sendStatus(403);
      }

      const summary = await storage.getAttenderDoctorsSummary(attenderId);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching doctors summary:', error);
      res.status(500).json({ message: 'Failed to fetch doctors summary' });
    }
  });

  app.get('/api/attender/schedules-today', async (req, res) => {
    console.log('Schedules request:', { user: req.user });
  
    // Auth check
    if (!req.user || req.user.role !== 'attender') {
      console.log('Auth failed:', { user: req.user?.role });
      return res.sendStatus(403);
    }
  
    try {
      const attenderId = req.user.id;
  
      const schedules = await storage.getAttenderSchedulesToday(attenderId);
      res.json(schedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      res.status(500).json({ message: 'Failed to fetch schedules' });
    }
  });
  
   app.get("/api/clinics/:clinicId/doctors", async (req, res) => {
      try {
        const clinicId = parseInt(req.params.clinicId);
        const doctors = await storage.getDoctorsByClinic(clinicId);
        res.json(doctors);
      } catch (error) {
        console.error('Error fetching clinic doctors:', error);
        res.status(500).json({ message: 'Failed to fetch doctors' });
      }
    });

    app.get("/api/attender-doctor/:attenderId", async (req, res) => {
      try {
        const attenderId = parseInt(req.params.attenderId);
        const doctors = await storage.getAttenderDoctors(attenderId);
        res.json(doctors);
      } catch (error) {
        console.error('Error fetching clinic doctors:', error);
        res.status(500).json({ message: 'Failed to fetch doctors' });
      }
    });

    // Assign doctor to attender
    app.post("/api/attender-doctors", async (req, res) => {
      try {
        const { attenderId, doctorId, clinicId } = req.body;

        if (!attenderId || !doctorId || !clinicId) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        const relationship = await storage.addDoctorToAttender(
          parseInt(attenderId),
          parseInt(doctorId),
          parseInt(clinicId)
        );

        res.status(201).json(relationship);
      } catch (error) {
        console.error('Error assigning doctor to attender:', error);
        res.status(500).json({ message: 'Failed to assign doctor to attender' });
      }
    });

    // Remove a doctor assignment
    app.delete("/api/attender-doctors", async (req, res) => {
      try {
        const { attenderId, doctorId } = req.body;

        if (!attenderId || !doctorId) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        await storage.removeDoctorFromAttender(
          parseInt(attenderId),
          parseInt(doctorId)
        );

        res.status(200).json({ message: 'Doctor removed from attender successfully' });
      } catch (error) {
        console.error('Error removing doctor from attender:', error);
        res.status(500).json({ message: 'Failed to remove doctor from attender' });
      }
    });

    // Get users by role and clinicId
    app.get("/api/users", async (req, res) => {
      try {
        const { role, clinicId } = req.query;

        if (!role) {
          return res.status(400).json({ message: 'Role parameter is required' });
        }

        // If clinicId is provided, filter by clinic
        if (clinicId) {
          const users = await storage.getAttendersByClinic(parseInt(clinicId as string));
          // Filter by role if specified
          const filteredUsers = role ? users.filter(user => user.role === role) : users;
          return res.json(filteredUsers);
        }

        // If role is attender, use the specific method
        if (role === 'attender') {
          const attenders = await storage.getAttendersByRole();
          return res.json(attenders);
        }

        // Otherwise get all users and filter by role
        const allUsers = await storage.getDoctors(); // This actually gets all users despite the name
        const filteredUsers = allUsers.filter(user => user.role === role);
        res.json(filteredUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
      }
    });

    // Delete user by ID
    app.delete("/api/users/:id", async (req, res) => {
      try {
        // Check if user is authorized (must be clinic_admin or super_admin)
        if (!req.user || (req.user.role !== "clinic_admin" && req.user.role !== "super_admin")) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        const userId = parseInt(req.params.id);
        await storage.deleteUser(userId);
        res.status(200).json({ message: 'User deleted successfully' });
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
      }
    });

    // Update user by ID
    app.put("/api/users/:id", async (req, res) => {
      try {
        // Check if user is authorized (must be clinic_admin or super_admin)
        if (!req.user || (req.user.role !== "clinic_admin" && req.user.role !== "super_admin")) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        const userId = parseInt(req.params.id);
        const userData = req.body;

        // Don't allow changing role through this endpoint
        delete userData.role;

        const updatedUser = await storage.updateUser(userId, userData);
        res.json(updatedUser);
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user' });
      }
    });

  // Update doctor (complete record) Endpoints
  app.patch('/api/doctors/:id', async (req, res) => {
    if (!req.user || req.user.role !== 'attender') return res.sendStatus(403);
    try {
      const doctorId = parseInt(req.params.id);

      // Validate request body
      const updateDoctorSchema = z.object({
        user: z.object({
          name: z.string(),
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

      const validatedData = updateDoctorSchema.parse(req.body);

      // Update the doctor
      const doctor = await storage.updateDoctor(
        doctorId,
        validatedData.user,
        validatedData.details
      );

      res.json(doctor);
    } catch (error) {
      console.error("Error updating doctor:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update doctor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}