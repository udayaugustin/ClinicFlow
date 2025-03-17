import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage, type IStorage } from "./storage";
import { insertAppointmentSchema, insertAttenderDoctorSchema, type AttenderDoctor, type User } from "@shared/schema";

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

      const appointmentData = insertAppointmentSchema.parse({
        ...req.body,
        patientId: req.user.id,
        clinicId: doctor.clinicId,
      });

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
      const { status } = req.body;

      if (!["scheduled", "completed", "in_progress"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Update the appointment status
      const updatedAppointment = await storage.updateAppointmentStatus(appointmentId, status);
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

  // Get token progress for a doctor on a specific date
  app.get("/api/doctors/:id/token-progress", async (req, res) => {
    try {
      const doctorId = parseInt(req.params.id);
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const clinicId = parseInt(req.query.clinicId as string);

      console.log('Token Progress Request:', {
        doctorId,
        clinicId,
        date,
        params: req.params,
        query: req.query
      });

      if (!clinicId || isNaN(clinicId)) {
        return res.status(400).json({ message: 'Clinic ID is required' });
      }

      if (!doctorId || isNaN(doctorId)) {
        return res.status(400).json({ message: 'Invalid doctor ID' });
      }

      const progress = await storage.getCurrentTokenProgress(doctorId, clinicId, date);
      console.log('Token Progress Response:', progress);
      res.json(progress);
    } catch (error) {
      console.error('Error fetching token progress:', error);
      if (error instanceof Error) {
        res.status(500).json({ 
          message: 'Failed to fetch token progress',
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      } else {
        res.status(500).json({ 
          message: 'Failed to fetch token progress',
          error: 'Unknown error'
        });
      }
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

      const progress = await storage.updateTokenProgress(
        doctorId,
        clinicId,
        new Date(date),
        currentToken,
        req.user.id
      );

      res.json(progress);
    } catch (error) {
      console.error('Error updating token progress:', error);
      res.status(500).json({ message: 'Failed to update token progress' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}