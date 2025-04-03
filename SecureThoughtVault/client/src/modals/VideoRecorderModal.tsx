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
import { VideoPlayer } from "@/components/ui/video-player";
import { VideoEditor } from "@/components/ui/video-editor";
import { useIndexedDB } from "@/lib/useIndexedDB";
import { Entry } from "@shared/schema";
import { insertEntrySchema } from "@shared/schema";
import { 
  isMobileDevice, 
  isIOS, 
  isAndroid, 
  shouldUseIOSNativeCapture,
  shouldUseNativeCapture,
  detectPlatform,
  openNativeFilePicker 
} from "@/lib/device-detection";

interface VideoRecorderModalProps {
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
  mediaBlob: z.instanceof(Blob).optional(),
  mediaUrl: z.string().optional(),
});

export default function VideoRecorderModal({ isOpen, onClose, entry, onSchedule }: VideoRecorderModalProps) {
  const { toast } = useToast();
  const { saveBlob, getBlob } = useIndexedDB();
  const entryExists = !!entry;
  
  // State for managing recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isMobile] = useState(isMobileDevice());
  const [useNative] = useState(shouldUseNativeCapture());
  const [useIOSNative] = useState(shouldUseIOSNativeCapture());
  const [platform] = useState(detectPlatform());
  
  // Title state separate from form
  const [titleValue, setTitleValue] = useState("");
  
  // Handle native device camera for video recording (works for all platforms)
  const handleNativeCapture = async () => {
    try {
      const videoFile = await openNativeFilePicker('video/*');
      if (videoFile) {
        console.log(`Video file selected from native ${platform} picker:`, videoFile.name, videoFile.size, "bytes");
        const blob = new Blob([videoFile], { type: videoFile.type });
        const url = URL.createObjectURL(blob);
        handleRecordingComplete(blob, url);
      }
    } catch (error) {
      console.error(`Error with ${platform} native video capture:`, error);
      toast({
        title: "Camera Error",
        description: "There was a problem accessing your camera. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Legacy function for backward compatibility
  const handleIOSNativeCapture = () => handleNativeCapture();
  
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
  
  // Handle title changes manually
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleValue(e.target.value);
  };
  
  // Set up form with empty defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      visibility: "private",
      categoryId: undefined,
      mediaUrl: "",
    },
  });
  
  // Load entry data when editing or when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    if (entryExists && entry) {
      // Set title state directly
      setTitleValue(entry.title || "");
      
      // Set form values
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
  }, [isOpen, entryExists, entry?.id]);
  
  // Handle recording completion
  const handleRecordingComplete = (blob: Blob, url: string) => {
    console.log("Video recording completed. Blob size:", blob.size, "URL:", url, "Type:", blob.type);
    
    if (!blob || blob.size === 0) {
      toast({
        title: "Error",
        description: "The video recording appears to be empty. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Create a local copy of the URL to ensure it persists
    try {
      // Create a duplicate blob to ensure browser compatibility
      const videoBlob = new Blob([blob], { type: blob.type || 'video/webm' });
      console.log("New video blob created:", videoBlob.size, "bytes. Type:", videoBlob.type);
      
      // Create fresh URL from our duplicated blob
      const safeUrl = URL.createObjectURL(videoBlob);
      console.log("Fresh URL created:", safeUrl);
      
      // Add a small delay to let the browser process the blob
      setTimeout(() => {
        setRecordedBlob(videoBlob);
        setRecordedUrl(safeUrl);
        // On mobile, show video editor immediately after recording
        if (isMobile) {
          setShowVideoEditor(true);
          setShowRecorder(false);
        } else {
          setShowRecorder(false);
        }
        
        form.setValue("mediaBlob", videoBlob);
        form.setValue("mediaUrl", safeUrl);
        
        console.log("Video state updated with blob and URL");
      }, 100);
    } catch (error) {
      console.error("Error processing video recording:", error);
      toast({
        title: "Error",
        description: "Failed to process video recording. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle video editing completion
  const handleEditingComplete = (
    videoBlob: Blob,
    thumbBlob: Blob,
    thumbUrl: string,
    startTime: number,
    endTime: number
  ) => {
    setThumbnailBlob(thumbBlob);
    setThumbnailUrl(thumbUrl);
    setTrimStart(startTime);
    setTrimEnd(endTime);
    setShowVideoEditor(false);
    
    // If we had any trimming parameters, we'd also attach these to the entry metadata
    console.log(`Video edited with trim points: ${startTime}s to ${endTime}s`);
    console.log(`Thumbnail created at ${thumbUrl}`);
    
    // In a full implementation, we would process the video to apply the trim
    // For now, we'll just save the original video with the trim parameters
  };
  
  // Reset recording
  const handleReset = () => {
    setShowRecorder(true);
    setShowVideoEditor(false);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setThumbnailBlob(null);
    setThumbnailUrl(null);
    form.setValue("mediaBlob", undefined);
    form.setValue("mediaUrl", "");
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Open video editor
  const handleEditVideo = () => {
    if (recordedUrl) {
      setShowVideoEditor(true);
    }
  };
  
  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("Create video mutation started with data:", data);
      
      // Use recordedBlob directly if mediaBlob isn't set
      const blobToSave = data.mediaBlob || recordedBlob;
      
      // Save blob to IndexedDB and get permanent URL
      let permanentUrl = data.mediaUrl || recordedUrl || "";
      if (blobToSave) {
        console.log("Saving video blob to permanent URL...", blobToSave.size, "bytes");
        try {
          // Try first with the indexed DB
          permanentUrl = await saveBlob(blobToSave);
          console.log("Video blob saved successfully to permanent URL:", permanentUrl);
        } catch (error) {
          console.error("Error saving video blob:", error);
          // Fallback to using the URL directly if IndexedDB fails
          permanentUrl = recordedUrl || "";
          console.log("Using fallback video URL:", permanentUrl);
        }
      } else {
        console.warn("No video blob provided for saving");
      }
      
      // Make sure we have a valid URL - this is critical
      if (!permanentUrl) {
        console.error("Failed to get valid video URL");
        throw new Error("Failed to save video recording: Could not generate media URL");
      }
      
      // Save thumbnail if available
      let thumbnailUrlToSave = null;
      if (thumbnailBlob) {
        try {
          thumbnailUrlToSave = await saveBlob(thumbnailBlob);
        } catch (error) {
          console.error("Error saving thumbnail:", error);
        }
      }
      
      const payload = {
        title: data.title || titleValue || `Video Note - ${new Date().toLocaleString()}`, // Use titleValue as backup
        visibility: "private", // Always save as private initially
        categoryId: data.categoryId,
        type: "video",
        mediaUrl: permanentUrl,
        content: permanentUrl, // Use the media URL as content to support playback
        userId: 1,
        // Add metadata for trim points and thumbnail
        metadata: JSON.stringify({
          trimStart,
          trimEnd,
          thumbnailUrl: thumbnailUrlToSave,
        }),
      };
      
      console.log("Sending video payload to server:", payload);
      
      const response = await apiRequest("POST", "/api/entries", payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      toast({
        title: "Success",
        description: "Your video note has been saved. You can schedule it from your library.",
      });
      
      console.log("Video entry saved with 'private' visibility, closing modal");
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save video note: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("Update video mutation started with data:", data);
      
      // Use recordedBlob directly if mediaBlob isn't set
      const blobToSave = data.mediaBlob || recordedBlob;
      
      // Save blob to IndexedDB and get permanent URL
      let permanentUrl = data.mediaUrl || recordedUrl || "";
      if (blobToSave) {
        console.log("Saving video blob to permanent URL for update...", blobToSave.size, "bytes");
        try {
          // Try first with the indexed DB
          permanentUrl = await saveBlob(blobToSave);
          console.log("Video blob saved successfully for update, permanent URL:", permanentUrl);
        } catch (error) {
          console.error("Error saving video blob during update:", error);
          // Fallback to using the URL directly if IndexedDB fails
          permanentUrl = recordedUrl || "";
          console.log("Using fallback video URL for update:", permanentUrl);
        }
      } else {
        console.log("Using existing video URL for update:", permanentUrl);
      }
      
      // Make sure we have a valid URL - this is critical
      if (!permanentUrl) {
        console.error("Failed to get valid video URL for update");
        throw new Error("Failed to update video recording: Could not generate media URL");
      }
      
      // Save thumbnail if available
      let thumbnailUrlToSave = null;
      if (thumbnailBlob) {
        try {
          thumbnailUrlToSave = await saveBlob(thumbnailBlob);
        } catch (error) {
          console.error("Error saving thumbnail:", error);
        }
      }
      
      const payload = {
        title: data.title || titleValue || `Video Note - ${new Date().toLocaleString()}`, // Use titleValue as backup
        visibility: "private", // Always set to private
        categoryId: data.categoryId,
        mediaUrl: permanentUrl,
        content: permanentUrl, // Use the media URL as content to support playback
        // Add metadata for trim points and thumbnail
        metadata: JSON.stringify({
          trimStart,
          trimEnd,
          thumbnailUrl: thumbnailUrlToSave,
        }),
      };
      
      const response = await apiRequest("PATCH", `/api/entries/${entry?.id}`, payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-entries"] });
      toast({
        title: "Success",
        description: "Your video note has been updated.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update video note: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Check if recording exists
    if (!recordedUrl && !data.mediaUrl) {
      toast({
        title: "Error",
        description: "Please record a video before saving.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if title is provided
    if (!titleValue || titleValue.trim() === "") {
      toast({
        title: "Error",
        description: "Please enter a title for your video.",
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
      
      console.log("Submitting video data:", submissionData);
      
      if (entryExists) {
        updateMutation.mutate(submissionData);
      } else {
        createMutation.mutate(submissionData);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to save video. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Save the recording directly
  const handleSave = () => {
    console.log("Saving video...");
    
    // Validate the recording exists
    if (!recordedUrl) {
      toast({
        title: "Error",
        description: "Please record video before saving.",
        variant: "destructive",
      });
      return;
    }
    
    // If no title, use a default one
    if (!titleValue || titleValue.trim() === "") {
      setTitleValue("Video Note Draft - " + new Date().toLocaleString());
    }
    
    // Force submission
    form.handleSubmit(onSubmit)();
  };

  // Fullscreen recording view
  if (isFullscreen && showRecorder) {
    // For devices that should use native controls, even in fullscreen mode
    if (useNative) {
      // Immediately execute native capture and exit fullscreen
      setTimeout(() => {
        handleNativeCapture();
        setIsFullscreen(false);
      }, 100);
      
      // Return a temporary loading state while transitioning
      return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center" 
             role="dialog" 
             aria-modal="true">
          <div className="text-white text-center">
            <div className="animate-spin text-4xl mb-4">⟳</div>
            <p>Opening camera on {platform}...</p>
          </div>
        </div>
      );
    }
    
    // Regular fullscreen mode for non-iOS devices
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col" 
           role="dialog" 
           aria-modal="true" 
           aria-labelledby="fullscreen-video-title"
           aria-describedby="fullscreen-video-desc">
        <div className="sr-only" id="fullscreen-video-title">Video Recorder</div>
        <div className="sr-only" id="fullscreen-video-desc">Record a video using your device camera</div>
        <div className="p-4 flex justify-between items-center">
          <button 
            className="p-2 rounded-full text-white hover:bg-white hover:bg-opacity-20" 
            aria-label="Close"
            onClick={() => {
              setIsFullscreen(false);
              onClose();
            }}
          >
            <span className="material-icons">close</span>
          </button>
          <h2 className="font-semibold text-lg text-white">New Video Note</h2>
          <div className="w-10"></div> {/* Empty space for balance */}
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-full max-w-3xl mx-auto">
            <MediaRecorder 
              type="video"
              onRecordingComplete={(blob, url) => {
                handleRecordingComplete(blob, url);
                setIsFullscreen(false);
              }} 
              aspectRatio="video"
              className="w-full h-full"
            />
          </div>
        </div>
        
        {/* Additional controls for fullscreen mode */}
        <div className="p-4 flex justify-center">
          <div className="bg-black bg-opacity-50 rounded-full px-4 py-2 text-white">
            <p className="text-sm text-center mb-2">Maximum recording time: 2 minutes</p>
            <button 
              className="flex items-center justify-center mx-auto"
              onClick={() => setIsFullscreen(false)}
            >
              <span className="material-icons mr-1">keyboard_arrow_down</span>
              <span>Exit Fullscreen</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-lg w-[calc(100%-2rem)] max-w-md max-h-[90vh] mx-auto flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">{entryExists ? "Edit Video Note" : "New Video Note"}</DialogTitle>
        <DialogDescription className="sr-only">Create or edit a video note</DialogDescription>
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <button 
            className="p-1 rounded-full hover:bg-gray-200" 
            aria-label="Close"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
          <h2 className="font-semibold text-lg">{entryExists ? "Edit Video Note" : "New Video Note"}</h2>
          <div className="w-8"></div> {/* Spacer for alignment */}
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col h-full">
            <div className="p-4 flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Title input using direct state management instead of form control */}
              <div className="mb-6">
                <Input
                  placeholder="Title"
                  className="w-full p-2 text-lg font-medium focus:outline-none border-b border-gray-200"
                  value={titleValue}
                  onChange={handleTitleChange}
                />
              </div>
              
              {/* Video Recorder, Editor, or Player */}
              {showVideoEditor && recordedUrl ? (
                <VideoEditor
                  videoUrl={recordedUrl}
                  onSave={handleEditingComplete}
                  onCancel={() => setShowVideoEditor(false)}
                  className="mb-4"
                />
              ) : showRecorder ? (
                <div className="flex flex-col items-center">
                  {useNative ? (
                    // Native device recording approach 
                    <div className="text-center">
                      <Button 
                        variant="outline" 
                        onClick={handleNativeCapture}
                        className="mb-4"
                      >
                        <span className="material-icons mr-2">videocam</span>
                        Open Camera
                      </Button>
                      <p className="text-sm text-gray-500 text-center mb-4">
                        We'll use your device's native camera for better compatibility
                      </p>
                      
                      <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md">
                        <h4 className="font-medium mb-2">{platform} Video Recording</h4>
                        <p className="text-sm mb-2">
                          After recording, you'll be able to:
                        </p>
                        <ul className="text-xs text-left list-disc pl-4 mb-2">
                          <li>Save your recording to your library</li>
                          <li>Add a title and category</li>
                          <li>Schedule delivery to a contact</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Standard recording approach with custom UI
                    <>
                      <Button 
                        variant="outline" 
                        onClick={toggleFullscreen}
                        className="mb-4"
                      >
                        <span className="material-icons mr-2">videocam</span>
                        Start Recording
                      </Button>
                      <p className="text-sm text-gray-500 text-center">
                        Click to open the video recorder in fullscreen mode
                      </p>
                    </>
                  )}
                </div>
              ) : recordedUrl ? (
                <div className="flex flex-col items-center py-4">
                  {thumbnailUrl ? (
                    <div className="relative mb-4">
                      <img 
                        src={thumbnailUrl} 
                        alt="Video thumbnail" 
                        className="w-full h-32 object-contain rounded-md mb-2" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button 
                          className="p-3 rounded-full bg-black bg-opacity-50 text-white"
                          onClick={() => {
                            // Show video player instead of thumbnail
                            setThumbnailUrl(null);
                          }}
                        >
                          <span className="material-icons">play_arrow</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative mb-4">
                      <VideoPlayer 
                        src={recordedUrl} 
                        containerClassName="w-full rounded-md overflow-hidden" 
                        height="8rem"
                        width="100%"
                      />
                      <button 
                        className="absolute top-2 right-2 p-1 rounded-full bg-black bg-opacity-50 text-white text-xs"
                        onClick={handleEditVideo}
                      >
                        <span className="material-icons" style={{ fontSize: '16px' }}>edit</span>
                      </button>
                    </div>
                  )}
                  
                  <div className="flex space-x-3 mt-2">
                    <Button 
                      variant="outline" 
                      onClick={handleEditVideo}
                    >
                      <span className="material-icons mr-2">edit</span>
                      Edit Video
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      onClick={handleReset}
                    >
                      <span className="material-icons mr-2">refresh</span>
                      Record Again
                    </Button>
                  </div>
                </div>
              ) : null}
              
              {!showVideoEditor && (
                <>
                  <div className="mt-6 p-3 bg-gray-100 rounded-lg">
                    <h3 className="font-medium mb-2">Options</h3>
                    
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-700 mb-2">
                        First save your recording. Then from your library, you can schedule it to be sent later.
                      </p>
                      <div className="flex items-center text-xs text-blue-600">
                        <span className="material-icons text-xs mr-1">info</span>
                        All recordings saved as private by default
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => field.onChange(Number(value))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </div>
            
            {/* Action buttons */}
            {!showVideoEditor && (
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!recordedUrl || createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <span className="material-icons animate-spin mr-1 text-sm">refresh</span>
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}