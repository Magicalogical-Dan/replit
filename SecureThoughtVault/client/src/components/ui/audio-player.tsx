import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // When src changes, reset states
  useEffect(() => {
    setIsPlaying(false);
    setHasError(false);
    setIsLoaded(false);
    setCurrentTime(0);
    setProgress(0);
    
    // Log source for debugging
    console.log("Audio player src:", src);
    
    // Validate src
    if (!src || src === 'null' || src === 'undefined') {
      console.error("Invalid audio source provided:", src);
      setHasError(true);
      toast({
        title: "Error",
        description: "Invalid audio source. Please try recording again.",
        variant: "destructive"
      });
    }
  }, [src, toast]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      console.log("Audio loaded successfully. Duration:", audio.duration);
    };

    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      console.error("Audio loading error:", e);
      setHasError(true);
      toast({
        title: "Error",
        description: "Failed to load audio. Please try recording again.",
        variant: "destructive"
      });
    };

    // Set up events
    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('canplay', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('canplay', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [toast]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Handle play as a Promise for better error catching
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error("Error playing audio:", error);
            setHasError(true);
            toast({
              title: "Playback Error",
              description: "Could not play the recording. Please try again.",
              variant: "destructive"
            });
          });
      }
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className={cn("bg-gray-100 p-3 rounded-md", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {hasError ? (
        <div className="text-center py-2 text-red-500">
          <span className="material-icons mb-1">error_outline</span>
          <p className="text-sm">Audio could not be loaded</p>
        </div>
      ) : (
        <div className="flex items-center">
          <button 
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm", 
              isLoaded ? "bg-accent text-white" : "bg-gray-300 text-gray-500"
            )}
            onClick={togglePlayPause}
            disabled={!isLoaded}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <span className="material-icons text-sm">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          
          <div className="mx-3 flex-1">
            <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
