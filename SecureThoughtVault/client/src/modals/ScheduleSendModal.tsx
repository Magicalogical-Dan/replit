import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import ContactSelector from "@/components/ContactSelector";
import { Entry, Schedule, Contact, insertScheduleSchema } from "@shared/schema";

interface ScheduleSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry | null;
}

// Extend the schema to include a date string and time string for the form
const formSchema = z.object({
  contactId: z.number({
    required_error: "Please select a contact",
  }),
  deliveryDate: z.string().refine(val => !!val, {
    message: "Please select a date",
  }),
  deliveryTime: z.string().refine(val => !!val, {
    message: "Please select a time",
  }),
  reminderEnabled: z.boolean().default(false),
});

export default function ScheduleSendModal({ isOpen, onClose, entry }: ScheduleSendModalProps) {
  const { toast } = useToast();
  const [existingSchedule, setExistingSchedule] = useState<Schedule | null>(null);

  // Get contacts for dropdown
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: isOpen,
  });

  // Get existing schedule if there is one
  const { data: entriesWithSchedules } = useQuery({
    queryKey: ["/api/entries-with-schedules"],
    enabled: isOpen && !!entry,
    select: (data: any) => data.find((e: any) => e.id === entry?.id),
  });

  // Set up form with defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactId: undefined,
      deliveryDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      deliveryTime: "09:00",
      reminderEnabled: false,
    },
  });

  // Update form when entry or existing schedule changes
  // Log when modal opens with an entry
  useEffect(() => {
    if (isOpen && entry) {
      console.log("Schedule modal opened with entry:", entry);
    }
  }, [isOpen, entry]);

  useEffect(() => {
    if (isOpen && entriesWithSchedules?.schedule) {
      const schedule = entriesWithSchedules.schedule;
      console.log("Found existing schedule:", schedule);
      setExistingSchedule(schedule);
      
      const date = new Date(schedule.deliveryDate);
      
      form.reset({
        contactId: schedule.contactId,
        deliveryDate: format(date, "yyyy-MM-dd"),
        deliveryTime: format(date, "HH:mm"),
        reminderEnabled: schedule.reminderEnabled,
      });
    } else {
      setExistingSchedule(null);
      
      // Reset to defaults
      console.log("No existing schedule found, resetting to defaults");
      form.reset({
        contactId: undefined,
        deliveryDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
        deliveryTime: "09:00",
        reminderEnabled: false,
      });
    }
  }, [isOpen, entriesWithSchedules, form]);

  // Create/Update schedule mutations
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("Creating schedule with data:", data);
      
      if (!entry) {
        console.error("No entry provided for scheduling");
        throw new Error("No entry selected");
      }
      console.log("Entry for scheduling:", entry);
      
      // Validate date and time
      if (!data.deliveryDate || !data.deliveryTime) {
        console.error("Missing date or time for schedule");
        throw new Error("Date and time are required");
      }
      
      try {
        // Combine date and time into a single timestamp
        const dateTime = new Date(`${data.deliveryDate}T${data.deliveryTime}`);
        console.log("Parsed delivery date:", dateTime);
        
        if (isNaN(dateTime.getTime())) {
          throw new Error("Invalid date or time format");
        }
        
        const payload = {
          entryId: entry.id,
          contactId: data.contactId,
          deliveryDate: dateTime.toISOString(),
          reminderEnabled: data.reminderEnabled,
          userId: 1, // Ensure userId is provided
        };
        
        console.log("Sending schedule payload:", payload);
        
        const response = await apiRequest("POST", "/api/schedules", payload);
        const json = await response.json();
        console.log("Schedule creation response:", json);
        return json;
      } catch (error) {
        console.error("Error in schedule creation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-entries"] });
      toast({
        title: "Success",
        description: "Your thought has been scheduled successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to schedule thought: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("Updating schedule with data:", data);
      
      if (!existingSchedule) {
        console.error("No existing schedule found for update");
        throw new Error("No existing schedule found");
      }
      console.log("Existing schedule for update:", existingSchedule);
      
      // Validate date and time
      if (!data.deliveryDate || !data.deliveryTime) {
        console.error("Missing date or time for schedule update");
        throw new Error("Date and time are required");
      }
      
      try {
        // Combine date and time into a single timestamp
        const dateTime = new Date(`${data.deliveryDate}T${data.deliveryTime}`);
        console.log("Parsed updated delivery date:", dateTime);
        
        if (isNaN(dateTime.getTime())) {
          throw new Error("Invalid date or time format");
        }
        
        const payload = {
          contactId: data.contactId,
          deliveryDate: dateTime.toISOString(),
          reminderEnabled: data.reminderEnabled,
        };
        
        console.log("Sending update payload:", payload);
        console.log("To schedule with ID:", existingSchedule.id);
        
        const response = await apiRequest("PATCH", `/api/schedules/${existingSchedule.id}`, payload);
        const json = await response.json();
        console.log("Schedule update response:", json);
        return json;
      } catch (error) {
        console.error("Error in schedule update:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-entries"] });
      toast({
        title: "Success",
        description: "Your scheduled thought has been updated.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update schedule: ${error}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    try {
      console.log("Form submitted with data:", data);
      
      // Validate essential data is present
      if (!data.contactId) {
        toast({
          title: "Error",
          description: "Please select a contact to send to",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.deliveryDate || !data.deliveryTime) {
        toast({
          title: "Error",
          description: "Please select both a date and time for delivery",
          variant: "destructive",
        });
        return;
      }
      
      // Check if entry exists
      if (!entry) {
        toast({
          title: "Error",
          description: "No entry found to schedule. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // All validation passed, proceed with mutation
      if (existingSchedule) {
        console.log("Updating existing schedule:", existingSchedule.id);
        updateMutation.mutate(data);
      } else {
        console.log("Creating new schedule for entry:", entry.id);
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error("Error in schedule form submission:", error);
      toast({
        title: "Submission Error",
        description: "There was a problem scheduling your thought. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format the delivery preview
  const getDeliveryPreview = () => {
    const date = form.watch("deliveryDate");
    const time = form.watch("deliveryTime");
    
    if (!date || !time) return "Select date and time";
    
    try {
      const dateTime = new Date(`${date}T${time}`);
      return format(dateTime, "EEEE, MMMM d, yyyy 'at' h:mm a");
    } catch (e: unknown) {
      console.error("Error formatting date/time:", e);
      return "Invalid date/time";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-lg sm:rounded-lg w-[calc(100%-2rem)] max-w-md max-h-[85vh] mx-auto flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <button 
            className="p-1 rounded-full hover:bg-gray-200" 
            aria-label="Close"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
          <h2 className="font-semibold text-lg">Schedule Delivery</h2>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-4 flex-1 overflow-y-auto">
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-medium text-gray-700 mb-1">
                      Select Contact
                    </FormLabel>
                    <ContactSelector 
                      selectedContactId={field.value} 
                      onContactSelect={(id) => field.onChange(id)} 
                    />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem className="mb-6">
                    <FormLabel className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="deliveryTime"
                render={({ field }) => (
                  <FormItem className="mb-6">
                    <FormLabel className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Time
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="p-4 bg-gray-100 rounded-lg mb-4">
                <div className="flex items-center text-sm mb-2">
                  <span className="material-icons text-sm text-primary mr-1">schedule_send</span>
                  <span className="font-medium">Delivery Preview</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">This thought will be delivered on:</p>
                <p className="font-medium">{getDeliveryPreview()}</p>
              </div>
              
              <FormField
                control={form.control}
                name="reminderEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="reminder"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="reminder" className="font-medium text-gray-700">
                        Send me a reminder
                      </FormLabel>
                      <p className="text-sm text-gray-500">
                        Get notified 24 hours before this thought is delivered
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                className="mr-2"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {existingSchedule ? "Update Schedule" : "Schedule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
