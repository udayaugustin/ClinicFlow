import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertAppointmentSchema, insertAttenderDoctorSchema, insertUserSchema, insertClinicSchema } from "@shared/schema";

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
    if (!req.user || req.user.role !== "super_admin") return res.sendStatus(403);
    try {
      const { clinicIds, ...doctorData } = req.body;
      
      const userData = insertUserSchema.parse({
        ...doctorData,
        role: "doctor"
      });
      
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
    if (!req.user || req.user.role !== "super_admin") return res.sendStatus(403);
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
    if (!req.user || req.user.role !== "super_admin") return res.sendStatus(403);
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

      const appointment = await storage.updateAppointmentStatus(appointmentId, status);
      res.json(appointment);
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
    if (!req.user || (req.user.role !== "super_admin" && req.user.role !== "doctor")) {
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
    if (!req.user || (req.user.role !== "super_admin" && req.user.role !== "doctor")) {
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
    if (!req.user || (req.user.role !== "super_admin" && req.user.role !== "doctor")) {
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

  const httpServer = createServer(app);
  return httpServer;
}