import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface VideoEditorProps {
  videoUrl: string;
  onSave: (
    trimmedBlob: Blob,
    thumbnailBlob: Blob,
    thumbnailUrl: string,
    startTime: number,
    endTime: number
  ) => void;
  onCancel: () => void;
  maxDuration?: number; // Maximum duration in seconds
  className?: string;
}

export function VideoEditor({
  videoUrl,
  onSave,
  onCancel,
  maxDuration = 120, // 2 minutes
  className,
}: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [thumbnailTime, setThumbnailTime] = useState<number>(0);
  const [trimRange, setTrimRange] = useState<[number, number]>([0, maxDuration]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Initialize video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const videoDuration = video.duration;
      setDuration(videoDuration);
      // Default trim to full video, but respect max duration
      setTrimRange([0, Math.min(videoDuration, maxDuration)]);
      // Default thumbnail to 50% through the video (middle frame)
      const defaultThumbnailTime = videoDuration * 0.5;
      setThumbnailTime(defaultThumbnailTime);
      captureFrame(defaultThumbnailTime);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Loop playback within trim range
      if (video.currentTime >= trimRange[1]) {
        video.currentTime = trimRange[0];
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [maxDuration]);

  // Play/pause control
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play();
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Capture frame at specified time for thumbnail
  const captureFrame = (time: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Save current time
    const currentVideoTime = video.currentTime;
    
    // Set video to the time we want to capture
    video.currentTime = time;
    
    // Wait for the video to seek to the specified time
    const handleSeeked = () => {
      // Get video dimensions
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      // Set canvas dimensions to match video
      canvas.width = width;
      canvas.height = height;
      
      // Draw the video frame to the canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        
        // Convert canvas to data URL and set as thumbnail
        const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setThumbnailUrl(thumbnailDataUrl);
      }
      
      // Restore video to original playback position
      video.currentTime = currentVideoTime;
      
      // Remove the event listener
      video.removeEventListener("seeked", handleSeeked);
    };
    
    video.addEventListener("seeked", handleSeeked);
  };

  // Handle trim range change
  const handleTrimRangeChange = (value: number[]) => {
    // Ensure minimum duration of 1 second
    if (value[1] - value[0] < 1) {
      if (value[0] > trimRange[0]) {
        value[0] = value[1] - 1;
      } else {
        value[1] = value[0] + 1;
      }
    }
    
    setTrimRange([value[0], value[1]]);
    
    // Update video position to start of trim range
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
    }
  };

  // We use the middle frame as thumbnail automatically

  // Save edited video
  const handleSave = async () => {
    setIsProcessing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      
      // Get thumbnail as blob
      const thumbnailBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(new Blob([], { type: "image/jpeg" }));
        }, "image/jpeg", 0.8);
      });
      
      // For the trimmed video, we'll re-fetch the video as a blob
      // and trigger the save callback with our trim points
      const response = await fetch(videoUrl);
      const videoBlob = await response.blob();
      
      onSave(
        videoBlob,
        thumbnailBlob, 
        thumbnailUrl,
        trimRange[0],
        trimRange[1]
      );
    } catch (error) {
      console.error("Error processing video:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn("flex flex-col w-full max-w-md mx-auto", className)}>
      <div className="relative bg-black rounded-lg overflow-hidden mb-2">
        {/* Main video preview */}
        <video 
          ref={videoRef}
          src={videoUrl}
          className="w-full h-auto max-h-[8rem]" 
          playsInline
          onClick={() => setIsPlaying(!isPlaying)}
        />
        
        {/* Video controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 flex items-center space-x-1">
          <button 
            className="w-6 h-6 flex items-center justify-center rounded-full bg-white bg-opacity-20"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            <span className="material-icons text-white text-xs">
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
          
          <div className="flex-1 text-xs">
            {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
          </div>
        </div>
      </div>
      
      {/* Trim controls */}
      <div className="mb-2">
        <h3 className="text-xs font-medium">Trim Video</h3>
        <div className="px-1">
          <Slider
            value={[trimRange[0], trimRange[1]]}
            min={0}
            max={Math.min(duration, maxDuration)}
            step={0.1}
            onValueChange={handleTrimRangeChange}
            className="my-2"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatDuration(Math.floor(trimRange[0]))}</span>
          <span>Duration: {formatDuration(Math.floor(trimRange[1] - trimRange[0]))}</span>
          <span>{formatDuration(Math.floor(trimRange[1]))}</span>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-between space-x-2 mt-2">
        <button
          className="px-3 py-1.5 border border-gray-300 rounded-md text-xs"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button
          className="px-3 py-1.5 bg-primary text-white rounded-md text-xs flex items-center"
          onClick={handleSave}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="material-icons animate-spin mr-1 text-xs">refresh</span>
              Processing...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
      
      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}