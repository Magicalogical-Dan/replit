import { useEffect } from "react";

interface CreateScreenProps {
  isActive: boolean;
  onCreateText: () => void;
  onCreateAudio: () => void;
  onCreateVideo: () => void;
  setActiveTab: (tab: string) => void;
}

export default function CreateScreen({ 
  isActive, 
  onCreateText, 
  onCreateAudio, 
  onCreateVideo,
  setActiveTab 
}: CreateScreenProps) {
  const handleBackToHome = () => {
    setActiveTab("home");
  };

  if (!isActive) return null;

  return (
    <div className="px-4 py-6">
      <header className="flex justify-between items-center mb-6">
        <button 
          className="p-1 rounded-full hover:bg-gray-200" 
          aria-label="Back"
          onClick={handleBackToHome}
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold">Create New Thought</h1>
        <div className="w-10"></div> {/* Empty space for balance */}
      </header>

      {/* Create Options Grid */}
      <div className="grid grid-cols-1 gap-4 max-w-md mx-auto mt-8">
        {/* Text Note Option */}
        <button 
          className="create-option bg-white rounded-xl shadow p-6 flex items-center transition-shadow hover:shadow-md"
          onClick={onCreateText}
        >
          <div className="w-12 h-12 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-4">
            <span className="material-icons text-primary">description</span>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">Text Note</h3>
            <p className="text-sm text-gray-500">Write down your thoughts</p>
          </div>
        </button>

        {/* Voice Note Option */}
        <button 
          className="create-option bg-white rounded-xl shadow p-6 flex items-center transition-shadow hover:shadow-md"
          onClick={onCreateAudio}
        >
          <div className="w-12 h-12 rounded-full bg-accent bg-opacity-10 flex items-center justify-center mr-4">
            <span className="material-icons text-accent">mic</span>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">Voice Note</h3>
            <p className="text-sm text-gray-500">Record your voice</p>
          </div>
        </button>

        {/* Video Note Option */}
        <button 
          className="create-option bg-white rounded-xl shadow p-6 flex items-center transition-shadow hover:shadow-md"
          onClick={onCreateVideo}
        >
          <div className="w-12 h-12 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mr-4">
            <span className="material-icons text-primary">videocam</span>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">Video Note</h3>
            <p className="text-sm text-gray-500">Record a video message</p>
          </div>
        </button>
      </div>
    </div>
  );
}
