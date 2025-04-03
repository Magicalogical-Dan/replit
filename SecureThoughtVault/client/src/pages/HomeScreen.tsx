import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Entry, EntryWithSchedule, Contact } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CategoryTabs from "@/components/CategoryTabs";
import ThoughtCard from "@/components/ThoughtCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HomeScreenProps {
  isActive: boolean;
  onEditEntry: (entry: Entry) => void;
  onScheduleEntry: (entry: Entry) => void;
}

export default function HomeScreen({ 
  isActive, 
  onEditEntry, 
  onScheduleEntry 
}: HomeScreenProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch entries
  const { data: entries, isLoading } = useQuery<EntryWithSchedule[]>({
    queryKey: ["/api/entries-with-schedules"],
    enabled: isActive,
  });
  
  // Fetch contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: isActive,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-entries"] });
      toast({
        title: "Entry deleted",
        description: "Your thought has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete entry: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };

  const handleDeleteEntry = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Reset contact filter when category changes
  useEffect(() => {
    setSelectedContactId(null);
  }, [activeCategory]);
  
  // Handler for contact selection
  const handleContactChange = (value: string) => {
    setSelectedContactId(value && value !== "all" ? parseInt(value) : null);
  };
  
  // Filter thoughts based on active category and contact
  const filteredEntries = entries ? entries.filter(entry => {
    // First, filter by category
    const matchesCategory = 
      activeCategory === "all" ? true :
      activeCategory === "scheduled" ? entry.visibility === "scheduled" :
      (activeCategory === "text" || activeCategory === "audio" || activeCategory === "video") ? 
        entry.type === activeCategory :
        entry.categoryId === parseInt(activeCategory);
    
    // Then, filter by contact if one is selected
    if (!matchesCategory) return false;
    
    if (selectedContactId) {
      // Only return entries that have a schedule with the selected contact
      return entry.schedule?.contactId === selectedContactId;
    }
    
    return true;
  }) : [];

  if (!isActive) return null;

  return (
    <div className="px-4 py-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Thoughts</h1>
        <div className="flex space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Search">
            <span className="material-icons">search</span>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Filter">
            <span className="material-icons">filter_list</span>
          </button>
        </div>
      </header>

      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
      />
      
      {/* Contact filter - only show when there are contacts and for scheduled items */}
      {contacts.length > 0 && (activeCategory === "all" || activeCategory === "scheduled") && (
        <div className="mt-4 mb-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Filter by Contact</label>
            <Select
              value={selectedContactId?.toString() || "all"}
              onValueChange={handleContactChange}
            >
              <SelectTrigger className="w-48 bg-white border border-gray-300 rounded-lg">
                <SelectValue placeholder="All contacts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All contacts</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id.toString()}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedContactId && (
            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing thoughts scheduled for{' '}
                <span className="font-medium text-primary">
                  {contacts.find(c => c.id === selectedContactId)?.name}
                </span>
              </div>
              <button 
                className="text-xs text-gray-500 hover:text-primary"
                onClick={() => setSelectedContactId(null)}
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}

      <div className="thought-library space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse h-36" />
          ))
        ) : filteredEntries.length > 0 ? (
          filteredEntries.map(entry => (
            <ThoughtCard
              key={entry.id}
              thought={entry}
              onEdit={onEditEntry}
              onDelete={handleDeleteEntry}
              onSchedule={onScheduleEntry}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <span className="material-icons text-4xl text-gray-400 mb-2">sentiment_dissatisfied</span>
            <p className="text-gray-500">No thoughts in this category yet</p>
            <p className="text-gray-400 text-sm mt-1">Tap the + button to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}
