import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all examples
  app.get("/api/examples", async (_req, res) => {
    try {
      const examples = await storage.getAllExamples();
      res.json(examples);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch examples" });
    }
  });

  // Get example by ID
  app.get("/api/examples/:id", async (req, res) => {
    try {
      const example = await storage.getExampleById(req.params.id);
      if (!example) {
        return res.status(404).json({ error: "Example not found" });
      }
      res.json(example);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch example" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
