import { useState, useEffect, useRef } from 'react';

interface MediaRecorderHookOptions {
  onDataAvailable?: (blob: Blob) => void;
  onStop?: (blob: Blob, url: string) => void;
  mimeType?: string;
}

interface MediaRecorderHookResult {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  requestPermissions: () => Promise<MediaStream | null>;
  mediaStream: MediaStream | null;
  mediaBlobs: Blob[];
  recordingState: RecordingState;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  error: DOMException | null;
}

type RecordingState = 'inactive' | 'recording' | 'paused';

export function useMediaRecorder(
  constraints: MediaStreamConstraints,
  options: MediaRecorderHookOptions = {}
): MediaRecorderHookResult {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaBlobs, setMediaBlobs] = useState<Blob[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>('inactive');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState<DOMException | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  
  // Don't automatically request permissions - do this only when user initiates recording
  const requestPermissions = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new DOMException(
          'MediaDevices API is not supported in this browser', 
          'NotSupportedError'
        );
      }
      
      // Request device permission with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      setError(null); // Clear any previous errors
      return stream;
    } catch (err) {
      console.error('Media access error:', err);
      
      if (err instanceof DOMException) {
        setError(err);
        
        // Show appropriate error message based on the error
        switch (err.name) {
          case 'NotAllowedError':
            console.error('Permission to access media devices was denied');
            break;
          case 'NotFoundError':
            console.error('No media devices found that satisfy the constraints');
            break;
          case 'NotReadableError':
            console.error('Media device was found but could not be accessed');
            break;
          case 'OverconstrainedError':
            console.error('Media device does not satisfy the constraints');
            break;
          case 'SecurityError':
            console.error('Media access is not allowed due to security restrictions');
            break;
          default:
            console.error(`Unknown error occurred: ${err.name}`);
        }
      } else {
        setError(new DOMException('Unknown error occurred while accessing media devices'));
      }
      return null;
    }
  };
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [mediaStream, recordedUrl]);
  
  const startRecording = async () => {
    // If we don't have a media stream yet, request permissions
    if (!mediaStream) {
      const stream = await requestPermissions();
      if (!stream) {
        // If we couldn't get permissions, the error is already set by requestPermissions
        return;
      }
    }
    
    // Reset state
    mediaChunksRef.current = [];
    setMediaBlobs([]);
    setRecordedBlob(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    
    try {
      // Check if MediaRecorder is supported
      if (typeof MediaRecorder === 'undefined') {
        throw new DOMException(
          'MediaRecorder API is not supported in this browser',
          'NotSupportedError'
        );
      }
      
      // Determine best mime type for browser compatibility
      let mimeType = '';
      
      const audioTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2'
      ];
      
      const videoTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      
      // Check if we're recording audio or video based on constraints
      const isAudioOnly = !!constraints.audio && !constraints.video;
      const supportedTypes = isAudioOnly ? audioTypes : videoTypes;
      
      // Find first supported mime type
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      // Use user-specified mime type if provided and supported
      if (options.mimeType && MediaRecorder.isTypeSupported(options.mimeType)) {
        mimeType = options.mimeType;
      }
      
      // Ensure we have a mediaStream before creating a MediaRecorder
      if (!mediaStream) {
        throw new DOMException('No media stream available', 'AbortError');
      }
      
      // Create media recorder with selected mime type
      const recorder = new MediaRecorder(mediaStream, { 
        mimeType: mimeType || '' 
      });
      
      // Data is available when a chunk is completed
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
          setMediaBlobs((prev) => [...prev, event.data]);
          
          if (options.onDataAvailable) {
            options.onDataAvailable(event.data);
          }
        }
      });
      
      recorder.addEventListener('start', () => {
        setRecordingState('recording');
        setError(null); // Clear any previous errors
      });
      
      recorder.addEventListener('resume', () => {
        setRecordingState('recording');
      });
      
      recorder.addEventListener('pause', () => {
        setRecordingState('paused');
      });
      
      recorder.addEventListener('stop', () => {
        setRecordingState('inactive');
        
        if (mediaChunksRef.current.length === 0) {
          console.warn('No media data was recorded');
          return;
        }
        
        // Create a single blob from all chunks
        try {
          let blobType = recorder.mimeType;
          
          // If we don't have a valid MIME type from the recorder, try to find one
          if (!blobType || blobType === '') {
            // Check browser support for common MIME types
            if (isAudioOnly) {
              if (MediaRecorder.isTypeSupported('audio/webm'))
                blobType = 'audio/webm';
              else if (MediaRecorder.isTypeSupported('audio/mp4'))
                blobType = 'audio/mp4';
              else if (MediaRecorder.isTypeSupported('audio/ogg'))
                blobType = 'audio/ogg';
              else
                blobType = ''; // Let browser decide
            } else {
              if (MediaRecorder.isTypeSupported('video/webm'))
                blobType = 'video/webm';
              else if (MediaRecorder.isTypeSupported('video/mp4'))
                blobType = 'video/mp4';
              else
                blobType = ''; // Let browser decide
            }
          }
          
          console.log(`Creating blob with type: ${blobType || 'default browser type'}, chunks: ${mediaChunksRef.current.length}`);
          
          // Log the first chunk type for debugging
          if (mediaChunksRef.current.length > 0) {
            console.log(`First chunk type: ${mediaChunksRef.current[0].type}`);
          }
          
          // Create the Blob - if no type is specified, browser will determine from chunks
          const blob = blobType 
            ? new Blob(mediaChunksRef.current, { type: blobType })
            : new Blob(mediaChunksRef.current);
            
          console.log(`Blob created successfully. Size: ${blob.size} bytes, Type: ${blob.type || 'unknown'}`);
          
          // Verify the blob is valid
          if (blob.size === 0) {
            throw new Error('Created blob has zero size');
          }
          
          // Create URL
          const url = URL.createObjectURL(blob);
          console.log(`Blob URL created: ${url}`);
          
          // Store the recorded data
          setRecordedBlob(blob);
          setRecordedUrl(url);
          
          // Call the onStop callback with the blob and URL
          if (options.onStop) {
            options.onStop(blob, url);
          }
        } catch (error) {
          console.error('Error creating blob:', error);
          
          // Last resort: try with no type specification at all
          try {
            console.log(`Trying last resort blob creation without type specification`);
            
            // Create a blob without specifying type, letting the browser infer it
            const blob = new Blob(mediaChunksRef.current);
            
            if (blob.size === 0) {
              throw new Error('Last resort blob has zero size');
            }
            
            const url = URL.createObjectURL(blob);
            console.log(`Last resort blob created. Size: ${blob.size} bytes, URL: ${url}`);
            
            setRecordedBlob(blob);
            setRecordedUrl(url);
            
            if (options.onStop) {
              options.onStop(blob, url);
            }
          } catch (fallbackError) {
            console.error('All blob creation attempts failed:', fallbackError);
            setError(new DOMException('Failed to create recording', 'UnknownError'));
          }
        }
      });
      
      // Handle errors during recording
      recorder.addEventListener('error', (event) => {
        console.error('MediaRecorder error:', event);
        setError(new DOMException('Error occurred during recording', 'AbortError'));
      });
      
      // Start recording
      recorder.start(1000); // Collect data in 1-second chunks
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error('Error starting recorder:', err);
      if (err instanceof DOMException) {
        setError(err);
      } else {
        setError(new DOMException('Error starting recorder', 'UnknownError'));
      }
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };
  
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
    }
  };
  
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
    }
  };
  
  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    requestPermissions, // Expose the requestPermissions function
    mediaStream,
    mediaBlobs,
    recordingState,
    recordedBlob,
    recordedUrl,
    error,
  };
}
