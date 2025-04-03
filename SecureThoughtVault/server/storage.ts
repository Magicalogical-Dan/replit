import { 
  users, User, InsertUser, 
  categories, Category, InsertCategory,
  entries, Entry, InsertEntry,
  contacts, Contact, InsertContact,
  schedules, Schedule, InsertSchedule,
  EntryWithSchedule
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Category methods
  getCategories(userId: number): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<boolean>;

  // Entry methods
  getEntries(userId: number): Promise<Entry[]>;
  getEntryById(id: number): Promise<Entry | undefined>;
  getEntriesByType(userId: number, type: string): Promise<Entry[]>;
  getEntriesByCategory(userId: number, categoryId: number): Promise<Entry[]>;
  createEntry(entry: InsertEntry): Promise<Entry>;
  updateEntry(id: number, entry: Partial<Entry>): Promise<Entry | undefined>;
  deleteEntry(id: number): Promise<boolean>;

  // Contact methods
  getContacts(userId: number): Promise<Contact[]>;
  getContactById(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<boolean>;

  // Schedule methods
  getSchedules(userId: number): Promise<Schedule[]>;
  getScheduleById(id: number): Promise<Schedule | undefined>;
  getSchedulesByEntryId(entryId: number): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<Schedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: number): Promise<boolean>;

  // Combined queries
  getEntriesWithSchedules(userId: number): Promise<EntryWithSchedule[]>;
  getScheduledEntries(userId: number): Promise<EntryWithSchedule[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private entries: Map<number, Entry>;
  private contacts: Map<number, Contact>;
  private schedules: Map<number, Schedule>;
  
  private userIdCounter: number;
  private categoryIdCounter: number;
  private entryIdCounter: number;
  private contactIdCounter: number;
  private scheduleIdCounter: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.entries = new Map();
    this.contacts = new Map();
    this.schedules = new Map();
    
    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.entryIdCounter = 1;
    this.contactIdCounter = 1;
    this.scheduleIdCounter = 1;

    // Add default user
    this.createUser({
      username: "demo",
      password: "password",
      displayName: "Demo User",
      email: "demo@example.com"
    });
    
    // Add default categories
    this.createCategory({ userId: 1, name: "Personal" });
    this.createCategory({ userId: 1, name: "Work" });
    this.createCategory({ userId: 1, name: "Ideas" });

    // Add default contacts
    this.createContact({ userId: 1, name: "Myself", phoneNumber: "", email: "demo@example.com" });
    this.createContact({ userId: 1, name: "Mom", phoneNumber: "555-123-4567", email: "mom@example.com" });
    this.createContact({ userId: 1, name: "Partner", phoneNumber: "555-987-6543", email: "partner@example.com" });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      displayName: insertUser.displayName || null,
      email: insertUser.email || null
    };
    this.users.set(id, user);
    return user;
  }

  // Category methods
  async getCategories(userId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.userId === userId
    );
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Entry methods
  async getEntries(userId: number): Promise<Entry[]> {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.userId === userId
    );
  }

  async getEntryById(id: number): Promise<Entry | undefined> {
    return this.entries.get(id);
  }

  async getEntriesByType(userId: number, type: string): Promise<Entry[]> {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.userId === userId && entry.type === type
    );
  }

  async getEntriesByCategory(userId: number, categoryId: number): Promise<Entry[]> {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.userId === userId && entry.categoryId === categoryId
    );
  }

  async createEntry(insertEntry: InsertEntry): Promise<Entry> {
    const id = this.entryIdCounter++;
    const now = new Date();
    
    // Create a properly typed Entry object with all required fields
    const entry: Entry = { 
      id,
      userId: insertEntry.userId || 1, // Default to user ID 1 if not specified
      title: insertEntry.title,
      content: insertEntry.content || null,
      mediaUrl: insertEntry.mediaUrl || null,
      type: insertEntry.type,
      visibility: insertEntry.visibility || "private",
      categoryId: insertEntry.categoryId || null,
      metadata: insertEntry.metadata || null,
      createdAt: now
    };
    this.entries.set(id, entry);
    return entry;
  }

  async updateEntry(id: number, updatedEntry: Partial<Entry>): Promise<Entry | undefined> {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    
    const updated: Entry = { ...entry, ...updatedEntry };
    this.entries.set(id, updated);
    return updated;
  }

  async deleteEntry(id: number): Promise<boolean> {
    // Also delete associated schedules
    const schedules = Array.from(this.schedules.values()).filter(
      (schedule) => schedule.entryId === id
    );
    schedules.forEach(schedule => this.schedules.delete(schedule.id));
    
    return this.entries.delete(id);
  }

  // Contact methods
  async getContacts(userId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(
      (contact) => contact.userId === userId
    );
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.contactIdCounter++;
    const contact: Contact = { ...insertContact, id };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(id: number, updatedContact: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    
    const updated: Contact = { ...contact, ...updatedContact };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: number): Promise<boolean> {
    return this.contacts.delete(id);
  }

  // Schedule methods
  async getSchedules(userId: number): Promise<Schedule[]> {
    const userEntries = await this.getEntries(userId);
    const entryIds = userEntries.map(entry => entry.id);
    
    return Array.from(this.schedules.values()).filter(
      (schedule) => entryIds.includes(schedule.entryId)
    );
  }

  async getScheduleById(id: number): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async getSchedulesByEntryId(entryId: number): Promise<Schedule | undefined> {
    return Array.from(this.schedules.values()).find(
      (schedule) => schedule.entryId === entryId
    );
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const id = this.scheduleIdCounter++;
    const now = new Date();
    const schedule: Schedule = { 
      ...insertSchedule, 
      id, 
      status: "pending", 
      createdAt: now 
    };
    this.schedules.set(id, schedule);
    
    // Update entry visibility to scheduled
    const entry = await this.getEntryById(insertSchedule.entryId);
    if (entry) {
      await this.updateEntry(entry.id, { visibility: "scheduled" });
    }
    
    return schedule;
  }

  async updateSchedule(id: number, updatedSchedule: Partial<Schedule>): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;
    
    const updated: Schedule = { ...schedule, ...updatedSchedule };
    this.schedules.set(id, updated);
    return updated;
  }

  async deleteSchedule(id: number): Promise<boolean> {
    const schedule = this.schedules.get(id);
    if (schedule) {
      // Update entry visibility back to private
      const entry = await this.getEntryById(schedule.entryId);
      if (entry) {
        await this.updateEntry(entry.id, { visibility: "private" });
      }
    }
    
    return this.schedules.delete(id);
  }

  // Combined queries
  async getEntriesWithSchedules(userId: number): Promise<EntryWithSchedule[]> {
    const entries = await this.getEntries(userId);
    const result: EntryWithSchedule[] = [];
    
    for (const entry of entries) {
      const schedule = await this.getSchedulesByEntryId(entry.id);
      let contact;
      
      if (schedule) {
        contact = await this.getContactById(schedule.contactId);
      }
      
      result.push({
        ...entry,
        schedule: schedule ? {
          ...schedule,
          contact: contact
        } : undefined
      });
    }
    
    return result;
  }
  
  async getScheduledEntries(userId: number): Promise<EntryWithSchedule[]> {
    const entriesWithSchedules = await this.getEntriesWithSchedules(userId);
    return entriesWithSchedules.filter(entry => entry.schedule !== undefined);
  }
}

export const storage = new MemStorage();
