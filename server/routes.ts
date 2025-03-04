import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertAppointmentSchema, insertAttenderDoctorSchema } from "@shared/schema";

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
      const appointments = await storage.getAppointments(req.user.id);
      res.json(appointments);
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

  // New route for updating appointment status
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

  // New route for updating doctor availability
  app.patch("/api/doctors/:id/availability", async (req, res) => {
    if (!req.user || req.user.role !== "attender") return res.sendStatus(403);
    try {
      const doctorId = parseInt(req.params.id);
      const { isAvailable, currentToken } = req.body;

      const availability = await storage.updateDoctorAvailability(
        doctorId,
        new Date(),
        isAvailable,
        currentToken
      );
      res.json(availability);
    } catch (error) {
      console.error('Error updating doctor availability:', error);
      res.status(500).json({ message: 'Failed to update doctor availability' });
    }
  });

  // Add this new route after the existing doctor availability route
  app.get("/api/doctors/availability", async (req, res) => {
    try {
      const doctorIds = (req.query.doctorIds as string || "").split(",").map(Number);
      const date = new Date();

      const availabilities = await Promise.all(
        doctorIds.map(doctorId => storage.getDoctorAvailability(doctorId, date))
      );

      // Filter out any undefined values and return the result
      res.json(availabilities.filter(Boolean));
    } catch (error) {
      console.error('Error fetching doctor availabilities:', error);
      res.status(500).json({ message: 'Failed to fetch doctor availabilities' });
    }
  });

  // New routes for attender management
  app.get("/api/attenders/:clinicId", async (req, res) => {
    try {
      const attenders = await storage.getAttendersByClinic(parseInt(req.params.clinicId));
      res.json(attenders);
    } catch (error) {
      console.error('Error fetching attenders:', error);
      res.status(500).json({ message: 'Failed to fetch attenders' });
    }
  });

  app.get("/api/attender/:id/doctors", async (req, res) => {
    try {
      const doctors = await storage.getAttenderDoctors(parseInt(req.params.id));
      res.json(doctors);
    } catch (error) {
      console.error('Error fetching attender doctors:', error);
      res.status(500).json({ message: 'Failed to fetch attender doctors' });
    }
  });

  app.post("/api/attender/:id/doctors", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      const data = insertAttenderDoctorSchema.parse({
        attenderId: parseInt(req.params.id),
        doctorId: req.body.doctorId,
        clinicId: req.body.clinicId,
      });

      const relation = await storage.addDoctorToAttender(
        data.attenderId,
        data.doctorId,
        data.clinicId
      );
      res.status(201).json(relation);
    } catch (error) {
      console.error('Error adding doctor to attender:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  app.delete("/api/attender/:attenderId/doctors/:doctorId", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
      await storage.removeDoctorFromAttender(
        parseInt(req.params.attenderId),
        parseInt(req.params.doctorId)
      );
      res.sendStatus(200);
    } catch (error) {
      console.error('Error removing doctor from attender:', error);
      res.status(500).json({ message: 'Failed to remove doctor from attender' });
    }
  });

  // Update the attender appointments endpoint to ensure complete data
  app.get("/api/attender/:id/doctors/appointments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    if (req.user.role !== "attender") return res.sendStatus(403);

    try {
      const doctorRelations = await storage.getAttenderDoctors(parseInt(req.params.id));
      if (!doctorRelations.length) {
        return res.json([]);
      }

      const doctorsWithAppointments = await Promise.all(
        doctorRelations.map(async ({ doctor }) => {
          if (!doctor) {
            console.error('Missing doctor data in relation');
            return null;
          }

          const appointments = await storage.getAppointments(doctor.id);
          return {
            doctor,
            appointments,
          };
        })
      );

      // Filter out any null entries from failed doctor lookups
      const validData = doctorsWithAppointments.filter(Boolean);
      res.json(validData);
    } catch (error) {
      console.error('Error fetching attender doctor appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}