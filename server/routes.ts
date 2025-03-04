import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/doctors", async (_req, res) => {
    const doctors = await storage.getDoctors();
    res.json(doctors);
  });

  app.get("/api/doctors/:specialty", async (req, res) => {
    const doctors = await storage.getDoctorsBySpecialty(req.params.specialty);
    res.json(doctors);
  });

  app.get("/api/appointments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const appointments = await storage.getAppointments(req.user.id);
    res.json(appointments);
  });

  app.post("/api/appointments", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const appointment = await storage.createAppointment({
      ...req.body,
      patientId: req.user.id,
      status: "scheduled",
    });
    res.json(appointment);
  });

  const httpServer = createServer(app);
  return httpServer;
}
