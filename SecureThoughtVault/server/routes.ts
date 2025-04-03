import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEntrySchema, 
  insertContactSchema, 
  insertScheduleSchema,
  insertCategorySchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // User endpoints
  router.get("/users/me", async (req, res) => {
    // For demo purposes, we'll always use the demo user
    const user = await storage.getUser(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Don't send the password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Categories endpoints
  router.get("/categories", async (req, res) => {
    const categories = await storage.getCategories(1);
    res.json(categories);
  });

  router.post("/categories", async (req, res) => {
    try {
      const data = insertCategorySchema.parse({ ...req.body, userId: 1 });
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  router.delete("/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    const deleted = await storage.deleteCategory(id);
    if (!deleted) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    res.status(204).send();
  });

  // Entries endpoints
  router.get("/entries", async (req, res) => {
    const type = req.query.type as string | undefined;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    
    let entries;
    if (type) {
      entries = await storage.getEntriesByType(1, type);
    } else if (categoryId && !isNaN(categoryId)) {
      entries = await storage.getEntriesByCategory(1, categoryId);
    } else {
      entries = await storage.getEntries(1);
    }
    
    res.json(entries);
  });

  router.get("/entries/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    const entry = await storage.getEntryById(id);
    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }
    
    res.json(entry);
  });

  router.post("/entries", async (req, res) => {
    try {
      const data = insertEntrySchema.parse({ ...req.body, userId: 1 });
      const entry = await storage.createEntry(data);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create entry" });
    }
  });

  router.patch("/entries/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    try {
      const updated = await storage.updateEntry(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Entry not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update entry" });
    }
  });

  router.delete("/entries/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    const deleted = await storage.deleteEntry(id);
    if (!deleted) {
      return res.status(404).json({ error: "Entry not found" });
    }
    
    res.status(204).send();
  });

  // Contacts endpoints
  router.get("/contacts", async (req, res) => {
    const contacts = await storage.getContacts(1);
    res.json(contacts);
  });

  router.post("/contacts", async (req, res) => {
    try {
      const data = insertContactSchema.parse({ ...req.body, userId: 1 });
      const contact = await storage.createContact(data);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  router.patch("/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    try {
      const updated = await storage.updateContact(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  router.delete("/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    const deleted = await storage.deleteContact(id);
    if (!deleted) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    res.status(204).send();
  });

  // Schedules endpoints
  router.get("/entries-with-schedules", async (req, res) => {
    const entriesWithSchedules = await storage.getEntriesWithSchedules(1);
    res.json(entriesWithSchedules);
  });

  router.get("/scheduled-entries", async (req, res) => {
    const scheduledEntries = await storage.getScheduledEntries(1);
    res.json(scheduledEntries);
  });

  router.post("/schedules", async (req, res) => {
    try {
      const data = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(data);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  router.patch("/schedules/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    try {
      const updated = await storage.updateSchedule(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  router.delete("/schedules/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    const deleted = await storage.deleteSchedule(id);
    if (!deleted) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    
    res.status(204).send();
  });

  // Register all routes with /api prefix
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
