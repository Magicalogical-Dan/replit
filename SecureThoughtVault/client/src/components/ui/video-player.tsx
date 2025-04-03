import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface VideoPlayerProps {
  src: string;
  className?: string;
  poster?: string;
  height?: string | number;
  width?: string | number;
  containerClassName?: string;
}

export function VideoPlayer({ 
  src, 
  className, 
  poster, 
  height, 
  width,
  containerClassName
}: VideoPlayerProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // When src changes, reset states
  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    setIsLoaded(false);
    setCurrentTime(0);
    
    // Log source for debugging
    console.log("Video player src:", src);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const setVideoData = () => {
      setDuration(video.duration);
      setIsLoaded(true);
      console.log("Video loaded successfully. Duration:", video.duration);
    };

    const setVideoTime = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      console.error("Video loading error:", e);
      setHasError(true);
      toast({
        title: "Error",
        description: "Failed to load video. Please try recording again.",
        variant: "destructive"
      });
    };

    // Set up events
    video.addEventListener('loadeddata', setVideoData);
    video.addEventListener('loadedmetadata', setVideoData);
    video.addEventListener('canplay', setVideoData);
    video.addEventListener('timeupdate', setVideoTime);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', setVideoData);
      video.removeEventListener('loadedmetadata', setVideoData);
      video.removeEventListener('canplay', setVideoData);
      video.removeEventListener('timeupdate', setVideoTime);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [toast]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // Handle play as a Promise for better error catching
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error("Error playing video:", error);
            setHasError(true);
            toast({
              title: "Playback Error",
              description: "Could not play the video. Please try again.",
              variant: "destructive"
            });
          });
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Create style object for container if height/width provided
  const containerStyle: React.CSSProperties = {};
  if (height) containerStyle.height = height;
  if (width) containerStyle.width = width;
  
  // Create style object for video if height/width provided
  const videoStyle: React.CSSProperties = {};
  if (height) videoStyle.maxHeight = height;
  if (width) videoStyle.maxWidth = width;
  
  return (
    <div 
      className={cn(
        "relative rounded-md bg-gray-900 overflow-hidden", 
        containerClassName || className
      )}
      style={containerStyle}
    >
      <video 
        ref={videoRef} 
        src={src} 
        poster={poster}
        className={cn("w-full h-auto object-contain", className)}
        style={videoStyle}
        onClick={togglePlayPause}
        preload="metadata"
        playsInline
      />
      
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white">
          <div className="text-center">
            <span className="material-icons mb-2 text-red-500">error_outline</span>
            <p className="text-sm">Video could not be loaded</p>
          </div>
        </div>
      ) : (
        <>
          {!isPlaying && isLoaded && (
            <button 
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white bg-opacity-75 flex items-center justify-center"
              onClick={togglePlayPause}
              aria-label="Play video"
            >
              <span className="material-icons text-primary">play_arrow</span>
            </button>
          )}
          
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          )}
          
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            {formatTime(isPlaying ? currentTime : duration || 0)}
          </div>
        </>
      )}
    </div>
  );
}
