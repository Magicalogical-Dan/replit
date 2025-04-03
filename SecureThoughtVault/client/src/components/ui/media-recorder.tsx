import { useState, useRef, useEffect } from "react";
import { useMediaRecorder } from "@/lib/useMediaRecorder";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  isMobileDevice, 
  isIOS, 
  isAndroid,
  getOptimalConstraints,
  openNativeFilePicker
} from "@/lib/device-detection";

// Maximum recording time in seconds (2 minutes)
const MAX_RECORDING_TIME = 120;

interface MediaRecorderProps {
  type: "audio" | "video";
  onRecordingComplete: (blob: Blob, url: string) => void;
  className?: string;
  aspectRatio?: "square" | "video";
}

export function MediaRecorder({ 
  type, 
  onRecordingComplete, 
  className,
  aspectRatio = "video"
}: MediaRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Show time limit notification when the component mounts
  useEffect(() => {
    toast({
      title: "Recording Time Limit",
      description: "Recordings are limited to a maximum of 120 seconds per message.",
    });
  }, [toast]);
  
  // Detect if running on mobile
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if running on mobile when the component mounts
    setIsMobile(isMobileDevice());
  }, []);
  
  // Get optimized constraints based on device
  const constraints = getOptimalConstraints(type);
  
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    requestPermissions,
    mediaStream,
    recordingState,
    recordedBlob,
    recordedUrl,
    error
  } = useMediaRecorder(constraints);
  
  // Request media permissions when component mounts
  useEffect(() => {
    if (!mediaStream && !error) {
      requestPermissions();
    }
  }, [mediaStream, error, requestPermissions]);

  useEffect(() => {
    if (type === "video" && mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }
    
    if (type === "audio" && mediaStream && canvasRef.current) {
      drawAudioVisualization(mediaStream, canvasRef.current);
    }
  }, [type, mediaStream]);

  // Monitor recording time to enforce the 2-minute limit
  useEffect(() => {
    if (recordingTime >= MAX_RECORDING_TIME && isRecording && !isPaused) {
      toast({
        title: "Time Limit Reached",
        description: "Maximum recording time (2 minutes) reached. Your recording has been saved.",
      });
      stopRecording();
    }
  }, [recordingTime, isRecording, isPaused, stopRecording, toast]);

  useEffect(() => {
    if (recordingState === "recording") {
      setIsRecording(true);
      setIsPaused(false);
      startTimer();
    } else if (recordingState === "paused") {
      setIsPaused(true);
      stopTimer();
    } else if (recordingState === "inactive") {
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
      setRecordingTime(0);
      
      if (recordedBlob && recordedUrl) {
        onRecordingComplete(recordedBlob, recordedUrl);
      }
    }
  }, [recordingState, recordedBlob, recordedUrl, onRecordingComplete]);

  const drawAudioVisualization = (stream: MediaStream, canvas: HTMLCanvasElement) => {
    const audioContext = new AudioContext();
    const audioSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    audioSource.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const barWidth = (canvasWidth / bufferLength) * 2.5;
    
    const animate = () => {
      if (recordingState !== "inactive") {
        requestAnimationFrame(animate);
      }
      
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      analyser.getByteFrequencyData(dataArray);
      
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x, canvasHeight - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    animate();
  };

  // Handle native file picker for video on mobile devices
  const handleNativeFilePicker = async () => {
    try {
      const file = await openNativeFilePicker();
      if (file) {
        console.log("File selected from native picker:", file.name, file.type, file.size);
        
        // Validate the file is a video and under max size (100MB)
        if (!file.type.startsWith('video/')) {
          toast({
            title: "Invalid File Type",
            description: "Please select a video file.",
            variant: "destructive"
          });
          return;
        }
        
        const MAX_SIZE = 100 * 1024 * 1024; // 100MB
        if (file.size > MAX_SIZE) {
          toast({
            title: "File Too Large",
            description: "Please select a video file under 100MB.",
            variant: "destructive"
          });
          return;
        }
        
        // Create blob and URL
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const url = URL.createObjectURL(blob);
        
        // Complete the recording with the file
        onRecordingComplete(blob, url);
      }
    } catch (error) {
      console.error("Error using native file picker:", error);
      toast({
        title: "Error",
        description: "Failed to access native camera. Falling back to browser recording.",
        variant: "destructive"
      });
      // Fall back to regular recording
      startRecording();
    }
  };

  const handleStartRecording = () => {
    // Use native file picker on mobile for video
    if (isMobile && type === "video" && (isIOS() || isAndroid())) {
      handleNativeFilePicker();
    } else {
      startRecording();
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handlePauseResumeRecording = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  const startTimer = () => {
    if (timerRef.current) return;
    
    const startTime = Date.now() - recordingTime * 1000;
    
    timerRef.current = window.setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Render error states when media access fails
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <div className="text-red-500 mb-4">
          <span className="material-icons text-4xl">error_outline</span>
        </div>
        <h3 className="text-lg font-medium mb-2">Could not access {type} recording</h3>
        
        {error.name === 'NotAllowedError' && (
          <div className="text-sm text-gray-600 mb-4">
            <p className="mb-2">Permission to use your {type} device was denied.</p>
            <p>Please allow access to your {type === "audio" ? "microphone" : "camera and microphone"} in your browser settings and try again.</p>
          </div>
        )}
        
        {error.name === 'NotFoundError' && (
          <div className="text-sm text-gray-600 mb-4">
            <p className="mb-2">No {type === "audio" ? "microphone" : "camera"} was found on your device.</p>
            <p>Please make sure your device has a {type === "audio" ? "microphone" : "camera"} connected and try again.</p>
          </div>
        )}
        
        {error.name !== 'NotAllowedError' && error.name !== 'NotFoundError' && (
          <div className="text-sm text-gray-600 mb-4">
            <p className="mb-2">There was a problem accessing your {type === "audio" ? "microphone" : "camera"}.</p>
            <p>Error: {error.message || error.name}</p>
          </div>
        )}
        
        {/* Special mobile option for video recording */}
        {isMobile && type === "video" && (
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm mb-3"
            onClick={handleNativeFilePicker}
          >
            Use Device Camera
          </button>
        )}
        
        <button 
          className="mt-2 px-4 py-2 bg-primary text-white rounded-md shadow-sm"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {type === "video" ? (
        <div className={cn(
          "relative overflow-hidden bg-black",
          aspectRatio === "square" ? "aspect-square" : "aspect-[9/16]",
          "mx-auto"
        )}>
          {!mediaStream ? (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="flex flex-col items-center">
                <span className="material-icons text-4xl mb-2 animate-pulse">videocam</span>
                <p className="text-sm">Requesting camera access...</p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          
          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center bg-black bg-opacity-50 rounded-full px-3 py-1">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse"></div>
              <span className="text-white text-sm">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8">
          {!mediaStream ? (
            <div className="flex flex-col items-center justify-center h-32">
              <span className="material-icons text-4xl mb-2 animate-pulse">mic</span>
              <p className="text-sm">Requesting microphone access...</p>
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                width={300}
                height={100}
                className="w-full h-16 mb-8"
              />
              <div className="text-2xl font-medium mb-8">{formatTime(recordingTime)}</div>
            </>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-center space-x-6 mt-4">
        {isRecording ? (
          <>
            <button 
              className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center"
              onClick={handleStopRecording}
              aria-label="Discard recording"
            >
              <span className="material-icons">delete</span>
            </button>
            
            <button 
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center shadow-md",
                type === "audio" ? "bg-accent text-white" : "border-4 border-white"
              )}
              onClick={handleStopRecording}
              aria-label="Stop recording"
            >
              {type === "audio" ? (
                <span className="material-icons">stop</span>
              ) : (
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="material-icons text-white">stop</span>
                </div>
              )}
            </button>
            
            <button 
              className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center"
              onClick={handlePauseResumeRecording}
              aria-label={isPaused ? "Resume recording" : "Pause recording"}
            >
              <span className="material-icons">{isPaused ? 'play_arrow' : 'pause'}</span>
            </button>
          </>
        ) : (
          <>
            {isMobile && type === "video" ? (
              <div className="flex flex-col items-center">
                <button 
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center shadow-md",
                    "border-4 border-white"
                  )}
                  onClick={handleStartRecording}
                  disabled={!mediaStream}
                  aria-label="Start recording"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="material-icons text-white">videocam</span>
                  </div>
                </button>
                
                {/* Alternative option for mobile */}
                <button
                  className="mt-3 px-4 py-1 text-sm text-blue-700 rounded-full border border-blue-700"
                  onClick={handleNativeFilePicker}
                >
                  Use file picker
                </button>
                <p className="text-xs text-gray-500 mt-1 max-w-xs text-center">
                  {isIOS() ? "iOS users: Try the file picker if recording doesn't work" : 
                   isAndroid() ? "Android users: Try the file picker if recording doesn't work" : 
                   "Try the file picker if recording doesn't work"}
                </p>
              </div>
            ) : (
              <button 
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-md",
                  type === "audio" ? "bg-accent text-white" : "border-4 border-white"
                )}
                onClick={handleStartRecording}
                disabled={!mediaStream}
                aria-label="Start recording"
              >
                {type === "audio" ? (
                  <span className="material-icons">mic</span>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="material-icons text-white">videocam</span>
                  </div>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
