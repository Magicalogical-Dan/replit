import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { EntryWithSchedule } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer } from "@/components/ui/video-player";
import { cn } from "@/lib/utils";

interface ScheduleScreenProps {
  isActive: boolean;
  onEditEntry: (entry: EntryWithSchedule) => void;
}

export default function ScheduleScreen({ isActive, onEditEntry }: ScheduleScreenProps) {
  const { toast } = useToast();
  
  // Fetch scheduled entries
  const { data: scheduledEntries, isLoading } = useQuery<EntryWithSchedule[]>({
    queryKey: ["/api/scheduled-entries"],
    enabled: isActive,
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      toast({
        title: "Schedule canceled",
        description: "Your scheduled thought has been canceled.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to cancel schedule: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const handleEdit = (entry: EntryWithSchedule) => {
    onEditEntry(entry);
  };
  
  const handleCancelSchedule = (scheduleId: number) => {
    if (window.confirm("Are you sure you want to cancel this scheduled thought?")) {
      deleteMutation.mutate(scheduleId);
    }
  };
  
  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return format(new Date(date), "MMMM d, yyyy");
  };
  
  const formatTime = (date: Date | null) => {
    if (!date) return "";
    return format(new Date(date), "h:mm a");
  };
  
  const daysUntilDelivery = (date: Date | null) => {
    if (!date) return 0;
    return Math.max(0, differenceInDays(new Date(date), new Date()));
  };
  
  // Group entries by month
  const groupedEntries = scheduledEntries?.reduce<Record<string, EntryWithSchedule[]>>((acc, entry) => {
    if (!entry.schedule?.deliveryDate) return acc;
    
    const monthYear = format(new Date(entry.schedule.deliveryDate), "MMMM yyyy");
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    
    acc[monthYear].push(entry);
    return acc;
  }, {}) || {};
  
  if (!isActive) return null;

  return (
    <div className="px-4 py-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Scheduled Thoughts</h1>
        <div className="flex space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Search">
            <span className="material-icons">search</span>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Filter">
            <span className="material-icons">filter_list</span>
          </button>
        </div>
      </header>

      <div className="timeline space-y-6">
        {isLoading ? (
          Array(2).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="date-header flex items-center mb-4">
                <div className="h-px bg-gray-300 flex-grow mr-4"></div>
                <div className="h-5 w-20 bg-gray-200 rounded"></div>
                <div className="h-px bg-gray-300 flex-grow ml-4"></div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 h-64 mb-6"></div>
            </div>
          ))
        ) : Object.keys(groupedEntries).length > 0 ? (
          Object.entries(groupedEntries).map(([monthYear, entries]) => (
            <div key={monthYear}>
              {/* Date Header */}
              <div className="date-header flex items-center">
                <div className="h-px bg-gray-300 flex-grow mr-4"></div>
                <h2 className="text-sm font-medium text-gray-500">{monthYear}</h2>
                <div className="h-px bg-gray-300 flex-grow ml-4"></div>
              </div>

              {/* Scheduled Items */}
              <div className="space-y-6 mt-6">
                {entries.map(entry => (
                  <div key={entry.id} className="scheduled-item bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span className={cn(
                          "material-icons mr-2",
                          entry.type === "text" ? "text-primary" : 
                          entry.type === "audio" ? "text-accent" : "text-primary"
                        )}>
                          {entry.type === "text" ? "description" : 
                           entry.type === "audio" ? "mic" : "videocam"}
                        </span>
                        <h3 className="font-medium">{entry.title}</h3>
                      </div>
                      <div className="flex">
                        <button 
                          className="p-1 text-gray-500 hover:text-primary rounded transition-colors" 
                          aria-label="Edit schedule"
                          onClick={() => handleEdit(entry)}
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button 
                          className="p-1 text-gray-500 hover:text-danger rounded transition-colors" 
                          aria-label="Cancel schedule"
                          onClick={() => entry.schedule && handleCancelSchedule(entry.schedule.id)}
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-sm mb-2">
                      <span className="material-icons text-sm text-gray-500 mr-1">event</span>
                      <span className="text-gray-600 font-medium">{formatDate(entry.schedule?.deliveryDate)}</span>
                      <span className="mx-2 text-gray-400">·</span>
                      <span className="material-icons text-sm text-gray-500 mr-1">schedule</span>
                      <span className="text-gray-600">{formatTime(entry.schedule?.deliveryDate)}</span>
                    </div>
                    
                    <div className="flex items-center mb-4">
                      <span className="material-icons text-sm text-gray-500 mr-1">person</span>
                      <span className="text-sm text-gray-600">
                        To: {entry.schedule?.contact?.name}
                        {entry.schedule?.contact?.phoneNumber && ` (${entry.schedule.contact.phoneNumber})`}
                      </span>
                    </div>
                    
                    {entry.type === "text" && entry.content && (
                      <div className="journal-content p-3 bg-gray-100 rounded-md text-sm">
                        <p className="line-clamp-3">{entry.content}</p>
                      </div>
                    )}
                    
                    {entry.type === "audio" && entry.mediaUrl && (
                      <AudioPlayer src={entry.mediaUrl} />
                    )}
                    
                    {entry.type === "video" && entry.mediaUrl && (
                      <VideoPlayer src={entry.mediaUrl} />
                    )}
                    
                    <div className="mt-4 flex justify-between">
                      <div className="countdown text-sm font-medium text-primary">
                        <span className="material-icons text-sm align-text-bottom mr-1">timer</span>
                        Sends in {daysUntilDelivery(entry.schedule?.deliveryDate)} days
                      </div>
                      <button 
                        className="px-3 py-1 bg-primary text-white rounded-full text-sm font-medium transition-colors hover:bg-opacity-90"
                        onClick={() => handleEdit(entry)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <span className="material-icons text-4xl text-gray-400 mb-2">event_busy</span>
            <p className="text-gray-500">No scheduled thoughts yet</p>
            <p className="text-gray-400 text-sm mt-1">Create a thought and schedule it for the future</p>
          </div>
        )}
      </div>
    </div>
  );
}
