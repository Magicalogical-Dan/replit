/**
 * Utility functions for detecting device type and capabilities
 */

/**
 * Detects if the current device is a mobile device (iOS or Android)
 * @returns boolean indicating if the device is mobile
 */
export function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  
  // Android detection
  const isAndroid = /android/i.test(userAgent);
  
  return isIOS || isAndroid;
}

/**
 * Detects if the device is running iOS
 * @returns boolean indicating if the device is running iOS
 */
export function isIOS(): boolean {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
}

/**
 * Detects if the device is running Android
 * @returns boolean indicating if the device is running Android
 */
export function isAndroid(): boolean {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android/i.test(userAgent);
}

/**
 * Gets the name of the mobile operating system (iOS or Android)
 * @returns string with the OS name, or null if not a mobile device
 */
export function getMobileOS(): string | null {
  if (isIOS()) return 'iOS';
  if (isAndroid()) return 'Android';
  return null;
}

/**
 * Checks if the device has camera capabilities
 * @returns Promise<boolean> resolving to true if camera is available
 */
export async function hasCameraSupport(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return false;
  }
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error checking camera support:', error);
    return false;
  }
}

/**
 * Gets available camera information
 * @returns Promise resolving to array of camera devices
 */
export async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error getting available cameras:', error);
    return [];
  }
}

/**
 * Checks if the device has microphone capabilities
 * @returns Promise<boolean> resolving to true if microphone is available
 */
export async function hasMicrophoneSupport(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return false;
  }
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'audioinput');
  } catch (error) {
    console.error('Error checking microphone support:', error);
    return false;
  }
}

/**
 * Gets optimal constraints based on the device type
 * @param type The media type ("audio" or "video")
 * @returns MediaStreamConstraints optimized for the device
 */
export function getOptimalConstraints(type: "audio" | "video"): MediaStreamConstraints {
  const mobileOS = getMobileOS();
  
  if (type === "audio") {
    return {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    };
  }
  
  if (type === "video") {
    // Base video constraints
    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user" // Default to front camera
    };
    
    // iOS-specific optimizations
    if (mobileOS === 'iOS') {
      return {
        audio: true,
        video: {
          ...videoConstraints,
          width: { ideal: 720 }, // Lower resolution for iOS
          height: { ideal: 1280 }
        }
      };
    }
    
    // Android-specific optimizations
    if (mobileOS === 'Android') {
      return {
        audio: true,
        video: {
          ...videoConstraints,
          frameRate: { ideal: 30 }
        }
      };
    }
    
    // Default for desktop
    return {
      audio: true,
      video: videoConstraints
    };
  }
  
  // Fallback to basic constraints
  return {
    audio: type === "audio",
    video: type === "video"
  };
}

/**
 * Platform detection for optimal camera/video experience
 */
export type PlatformType = 'ios' | 'android' | 'mac' | 'windows' | 'linux' | 'unknown';

/**
 * Detects the current platform more comprehensively
 * @returns The detected platform type
 */
export function detectPlatform(): PlatformType {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  
  // Desktop OS detection
  if (/macintosh|mac os x/i.test(userAgent)) return 'mac';
  if (/windows|win32/i.test(userAgent)) return 'windows';
  if (/linux/i.test(userAgent)) return 'linux';
  
  return 'unknown';
}

/**
 * Determines if native camera controls should be used for the current platform
 * @returns boolean indicating if native camera approach is needed
 */
export function shouldUseNativeCapture(): boolean {
  const platform = detectPlatform();
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent.toLowerCase());
  
  // iOS devices almost always need native controls
  if (platform === 'ios') {
    // Check iOS version - newer versions have better MediaRecorder support
    let iosVersion = 0;
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
      iosVersion = parseInt(match[1], 10);
    }
    
    // iOS 14.3+ has better MediaRecorder, but still not great with custom controls
    return true; // Always use native on iOS for now
  }
  
  // Android also benefits from native controls on mobile browsers
  if (platform === 'android') {
    // Check if it's a mobile browser - for these we prefer native
    return isMobileDevice();
  }
  
  // Mac with Safari browser also has issues with MediaRecorder API
  if (platform === 'mac' && isSafari) {
    return true;
  }
  
  // All other platforms can use our custom recorder interface
  return false;
}

/**
 * Legacy alias for backward compatibility
 */
export function shouldUseIOSNativeCapture(): boolean {
  return shouldUseNativeCapture() && isIOS();
}

/**
 * Attempts to open the file picker for images/videos on mobile
 * This is an alternative to camera API on some mobile browsers
 * @returns Promise<File | null> resolving to the selected file or null if canceled
 */
export function openNativeFilePicker(accept: string = 'video/*'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    
    if (accept.includes('video')) {
      input.capture = 'camera';
    }
    
    input.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        resolve(files[0]);
      } else {
        resolve(null);
      }
    };
    
    // Handle cancel by user
    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (!input.files || input.files.length === 0) {
          resolve(null);
        }
      }, 300);
    }, { once: true });
    
    input.click();
  });
}