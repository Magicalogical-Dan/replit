import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MediaRecorder } from "@/components/ui/media-recorder";
import { AudioPlayer } from "@/components/ui/audio-player";
import { useIndexedDB } from "@/lib/useIndexedDB";
import { Entry } from "@shared/schema";
import { insertEntrySchema } from "@shared/schema";

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry | null;
  onSchedule: (entry: Entry) => void;
}

const formSchema = insertEntrySchema.pick({
  title: true,
  visibility: true,
  categoryId: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  mediaBlob: z.instanceof(Blob).optional(), // Must be exactly undefined or Blob, not null
  mediaUrl: z.string().optional(),
});

export default function AudioRecorderModal({ isOpen, onClose, entry, onSchedule }: AudioRecorderModalProps) {
  const { toast } = useToast();
  const { saveBlob, getBlob } = useIndexedDB();
  const isEditing = !!entry;
  
  // Separate state for managing recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(true);
  
  // Title state separate from form - initialize once, not on every render
  const [titleValue, setTitleValue] = useState("");
  
  // Get categories for dropdown
  interface Category {
    id: number;
    name: string;
    userId: number;
  }
  
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    initialData: [] as Category[],
  });
  
  // Set up form - ensure we don't initialize with entry data directly
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      visibility: "private",
      categoryId: undefined,
      mediaUrl: "",
    },
  });
  
  // Handle title changes manually
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleValue(e.target.value);
  };
  
  // Load entry data when editing or when modal opens - only run this once when the modal opens or changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (isEditing && entry) {
      // Set title state directly
      setTitleValue(entry.title || "");
      
      // Set other form values
      form.reset({
        title: entry.title || "",
        visibility: entry.visibility || "private",
        categoryId: entry.categoryId,
        mediaUrl: entry.mediaUrl || "",
      });
      
      if (entry.mediaUrl) {
        setShowRecorder(false);
        setRecordedUrl(entry.mediaUrl);
        
        // If we're loading from local storage
        if (entry.mediaUrl && entry.mediaUrl.startsWith("blob:")) {
          getBlob(entry.mediaUrl).then((blob) => {
            if (blob) {
              setRecordedBlob(blob);
            }
          });
        }
      }
    } else {
      // Reset for new recording
      setTitleValue("");
      form.reset({
        title: "",
        visibility: "private",
        categoryId: undefined,
        mediaUrl: "",
      });
      setShowRecorder(true);
      setRecordedBlob(null);
      setRecordedUrl(null);
    }
  }, [isOpen, isEditing, entry?.id]);
  
  // Handle recording completion
  const handleRecordingComplete = (blob: Blob, url: string) => {
    console.log("DEBUG: handleRecordingComplete called with blob size:", blob.size, "URL:", url, "Type:", blob.type);
    
    if (!blob || blob.size === 0) {
      console.error("DEBUG: Empty blob detected in handleRecordingComplete");
      toast({
        title: "Error",
        description: "The recording appears to be empty. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Create a local copy of the URL to ensure it persists
    try {
      // Use the original blob directly for simplicity
      console.log("DEBUG: Using original blob directly");
      
      // Create fresh URL from the blob
      const safeUrl = URL.createObjectURL(blob);
      console.log("DEBUG: Fresh URL created:", safeUrl);
      
      // Update state immediately without setTimeout
      setRecordedBlob(blob);
      setRecordedUrl(safeUrl);
      setShowRecorder(false);
      
      form.setValue("mediaBlob", blob);
      form.setValue("mediaUrl", safeUrl);
      
      // Immediately try saving to IndexedDB to check if that works
      saveBlob(blob).then(savedUrl => {
        console.log("DEBUG: Pre-saving to IndexedDB succeeded:", savedUrl);
      }).catch(error => {
        console.error("DEBUG: Pre-saving to IndexedDB failed:", error);
      });
      
      console.log("DEBUG: Audio state updated with blob and URL");
      
      // Create a simple test recording with default title if none exists
      if (!titleValue || titleValue.trim() === "") {
        const defaultTitle = "Voice Note - " + new Date().toLocaleString();
        console.log("DEBUG: Setting default title:", defaultTitle);
        setTitleValue(defaultTitle);
      }
      
      // Show success toast
      toast({
        title: "Recording Saved",
        description: "Recording is ready to save. Click 'Save' to continue.",
      });
    } catch (error) {
      console.error("DEBUG: Error processing recording:", error);
      toast({
        title: "Error",
        description: "Failed to process recording. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Reset recording
  const handleReset = () => {
    setShowRecorder(true);
    setRecordedBlob(null);
    setRecordedUrl(null);
    form.setValue("mediaBlob", undefined);
    form.setValue("mediaUrl", "");
  };
  
  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("Create mutation started with data:", data);
      
      // Use recordedBlob directly if mediaBlob isn't set
      const blobToSave = data.mediaBlob || recordedBlob;
      
      // Save blob to IndexedDB and get permanent URL
      let permanentUrl = data.mediaUrl || recordedUrl || "";
      if (blobToSave) {
        console.log("Saving blob to permanent URL...", blobToSave.size, "bytes");
        try {
          // Try first with the indexed DB
          permanentUrl = await saveBlob(blobToSave);
          console.log("Blob saved successfully to permanent URL:", permanentUrl);
        } catch (error) {
          console.error("Error saving blob:", error);
          // Fallback to using the URL directly if IndexedDB fails
          permanentUrl = recordedUrl || "";
          console.log("Using fallback URL:", permanentUrl);
        }
      } else {
        console.warn("No media blob provided for saving");
      }
      
      // Make sure we have a valid URL - this is critical
      if (!permanentUrl) {
        console.error("Failed to get valid media URL");
        throw new Error("Failed to save audio recording: Could not generate media URL");
      }
      
      console.log("CRITICAL DEBUG - Before creating payload:");
      console.log("- titleValue:", titleValue);
      console.log("- data.title:", data.title);
      console.log("- permanentUrl:", permanentUrl);
      console.log("- blobToSave size:", blobToSave ? blobToSave.size : "No blob");
      console.log("- recordedUrl:", recordedUrl);
      
      const payload = {
        title: data.title || titleValue || `Voice Note - ${new Date().toLocaleString()}`, // Use titleValue as backup
        visibility: "private", // Always save as private initially
        categoryId: data.categoryId,
        type: "audio",
        mediaUrl: permanentUrl,
        userId: 1,
        content: permanentUrl, // Use the media URL as content to support playback
      };
      
      console.log("CRITICAL DEBUG - Final payload:", JSON.stringify(payload));
      
      console.log("Sending payload to server:", payload);
      
      try {
        const response = await apiRequest("POST", "/api/entries", payload);
        const json = await response.json();
        console.log("Server response:", json);
        return json;
      } catch (error) {
        console.error("API request error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      toast({
        title: "Success",
        description: "Your voice note has been saved. You can schedule it from your library.",
      });
      
      console.log("Entry saved with 'private' visibility, closing modal");
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save voice note: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("Update mutation started with data:", data);
      
      // Use recordedBlob directly if mediaBlob isn't set
      const blobToSave = data.mediaBlob || recordedBlob;
      
      // Save blob to IndexedDB and get permanent URL
      let permanentUrl = data.mediaUrl || recordedUrl || "";
      if (blobToSave) {
        console.log("Saving blob to permanent URL in update...", blobToSave.size, "bytes");
        try {
          // Try first with the indexed DB
          permanentUrl = await saveBlob(blobToSave);
          console.log("Blob saved successfully for update, permanent URL:", permanentUrl);
        } catch (error) {
          console.error("Error saving blob during update:", error);
          // Fallback to using the URL directly if IndexedDB fails
          permanentUrl = recordedUrl || "";
          console.log("Using fallback URL for update:", permanentUrl);
        }
      } else {
        console.log("Using existing media URL for update:", permanentUrl);
      }
      
      // Make sure we have a valid URL - this is critical
      if (!permanentUrl) {
        console.error("Failed to get valid media URL for update");
        throw new Error("Failed to save updated audio recording: Could not generate media URL");
      }
      
      const payload = {
        title: data.title || titleValue || `Voice Note - ${new Date().toLocaleString()}`, // Use titleValue as backup
        visibility: "private", // Always set to private
        categoryId: data.categoryId,
        mediaUrl: permanentUrl,
        content: permanentUrl, // Use the media URL as content to support playback
      };
      
      console.log("Sending update payload to server:", payload);
      console.log("Updating entry with ID:", entry?.id);
      
      try {
        const response = await apiRequest("PATCH", `/api/entries/${entry?.id}`, payload);
        const json = await response.json();
        console.log("Server response for update:", json);
        return json;
      } catch (error) {
        console.error("API update request error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-entries"] });
      toast({
        title: "Success",
        description: "Your voice note has been updated.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update voice note: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log("DEBUG: onSubmit called with data:", data);
    console.log("DEBUG: recordedUrl is:", recordedUrl);
    console.log("DEBUG: titleValue is:", titleValue);
    console.log("DEBUG: recordedBlob is:", recordedBlob ? `${recordedBlob.size} bytes` : "null");
    
    // Check if recording exists
    if (!recordedUrl && !data.mediaUrl) {
      console.error("DEBUG: No recording exists, showing error");
      toast({
        title: "Error",
        description: "Please record audio before saving.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if title is provided
    if (!titleValue || titleValue.trim() === "") {
      console.error("DEBUG: No title provided, showing error");
      toast({
        title: "Error",
        description: "Please enter a title for your recording.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Use the separate title state instead of form data title
      const submissionData = {
        ...data,
        title: titleValue // Use our manually tracked title state
      };
      
      console.log("DEBUG: Submitting data:", submissionData);
      console.log("DEBUG: Form values:", form.getValues());
      
      // Show a toast to indicate the submission is in progress
      toast({
        title: "Processing",
        description: "Saving your voice note...",
      });
      
      if (isEditing) {
        console.log("DEBUG: Calling updateMutation.mutate");
        updateMutation.mutate(submissionData);
      } else {
        console.log("DEBUG: Calling createMutation.mutate");
        createMutation.mutate(submissionData);
      }
      
      console.log("DEBUG: Mutation called successfully");
    } catch (error) {
      console.error("DEBUG: Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to save recording. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Save the recording directly
  const handleSave = () => {
    console.log("DEBUG: handleSave called");
    
    // Validate the recording exists
    if (!recordedUrl) {
      console.error("DEBUG: No recording exists in handleSave");
      toast({
        title: "Error",
        description: "Please record audio before saving.",
        variant: "destructive",
      });
      return;
    }
    
    // If no title, use a default one and update it immediately
    if (!titleValue || titleValue.trim() === "") {
      const defaultTitle = "Voice Note Draft - " + new Date().toLocaleString();
      console.log("DEBUG: Setting default title:", defaultTitle);
      setTitleValue(defaultTitle);
      
      // Submit directly with our synthesized data
      const submissionData = {
        ...form.getValues(),
        title: defaultTitle,
        mediaUrl: recordedUrl,
        mediaBlob: recordedBlob || undefined // Convert null to undefined to match the expected type
      };
      
      console.log("DEBUG: Directly submitting from handleSave:", submissionData);
      createMutation.mutate(submissionData);
    } else {
      // Submit directly rather than going through form submission
      const submissionData = {
        ...form.getValues(),
        title: titleValue,
        mediaUrl: recordedUrl,
        mediaBlob: recordedBlob || undefined // Convert null to undefined to match the expected type
      };
      
      console.log("DEBUG: Directly submitting from handleSave:", submissionData);
      createMutation.mutate(submissionData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-lg w-[calc(100%-2rem)] max-w-md max-h-[85vh] mx-auto flex flex-col">
        <DialogTitle className="sr-only">{isEditing ? "Edit Voice Note" : "New Voice Note"}</DialogTitle>
        <DialogDescription className="sr-only">Create or edit a voice note</DialogDescription>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <button 
            className="p-1 rounded-full hover:bg-gray-200" 
            aria-label="Close"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
          <h2 className="font-semibold text-lg">{isEditing ? "Edit Voice Note" : "New Voice Note"}</h2>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>
        
        <Form {...form}>
          <form 
            onSubmit={(e) => {
              console.log("DEBUG: Form onSubmit event triggered");
              form.handleSubmit(onSubmit)(e);
            }} 
            className="space-y-4"
          >
            <div className="p-4 flex-1 overflow-y-auto">
              {/* Title input using direct state management instead of form control */}
              <div className="mb-6">
                <Input
                  placeholder="Title"
                  className="w-full p-2 text-lg font-medium focus:outline-none border-b border-gray-200"
                  value={titleValue}
                  onChange={handleTitleChange}
                />
              </div>
              
              {/* Audio Recorder or Player */}
              {showRecorder ? (
                <MediaRecorder 
                  type="audio"
                  onRecordingComplete={handleRecordingComplete} 
                />
              ) : recordedUrl ? (
                <div className="flex flex-col items-center py-4">
                  <AudioPlayer src={recordedUrl} className="w-full mb-4" />
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={handleReset}
                  >
                    <span className="material-icons mr-2">refresh</span>
                    Record Again
                  </Button>
                </div>
              ) : null}
              
              <div className="mt-6 p-3 bg-gray-100 rounded-lg">
                <h3 className="font-medium mb-2">Options</h3>
                
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-700 mb-2">
                    First save your recording. Then from your library, you can schedule it to be sent later.
                  </p>
                  <div className="flex items-center text-xs text-blue-600">
                    <span className="material-icons text-xs mr-1">info</span>
                    <span>All recordings are private until you schedule them</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-gray-500 mr-2">label</span>
                    <span>Category</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <Select 
                          onValueChange={(value) => field.onChange(value && value !== "none" ? parseInt(value) : undefined)} 
                          value={field.value?.toString() || "none"}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border border-gray-300 rounded px-2 py-1 text-sm w-40">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {Array.isArray(categories) && categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button 
                type="button" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
