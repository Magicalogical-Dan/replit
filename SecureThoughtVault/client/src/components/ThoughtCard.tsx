import { useState } from "react";
import { format } from "date-fns";
import { AudioPlayer } from "@/components/ui/audio-player";
import { VideoPlayer } from "@/components/ui/video-player";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { EntryWithSchedule } from "@shared/schema";

interface ThoughtCardProps {
  thought: EntryWithSchedule;
  onEdit: (thought: EntryWithSchedule) => void;
  onDelete: (id: number) => void;
  onSchedule: (thought: EntryWithSchedule) => void;
}

export default function ThoughtCard({ thought, onEdit, onDelete, onSchedule }: ThoughtCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "";
    return format(new Date(date), "MMMM d, yyyy · h:mm a");
  };
  
  const handleEdit = () => {
    onEdit(thought);
  };
  
  const handleDelete = () => {
    onDelete(thought.id);
  };
  
  const handleSchedule = () => {
    onSchedule(thought);
  };
  
  const getIcon = () => {
    switch (thought.type) {
      case "text":
        return { icon: "description", color: "text-primary" };
      case "audio":
        return { icon: "mic", color: "text-accent" };
      case "video":
        return { icon: "videocam", color: "text-primary" };
      default:
        return { icon: "description", color: "text-primary" };
    }
  };
  
  const { icon, color } = getIcon();

  return (
    <div className="thought-card bg-white rounded-lg shadow p-4 transition-shadow hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <span className={cn("material-icons mr-2", color)}>{icon}</span>
          <h3 className="font-medium">{thought.title}</h3>
        </div>
        <div className="flex">
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-1 text-gray-500 hover:text-primary rounded-full transition-colors" 
                aria-label="More options"
              >
                <span className="material-icons">more_vert</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <span className="material-icons mr-2 text-sm">edit</span>
                Edit
              </DropdownMenuItem>
              {thought.visibility !== "scheduled" && (
                <DropdownMenuItem onClick={handleSchedule}>
                  <span className="material-icons mr-2 text-sm">schedule_send</span>
                  Schedule
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                <span className="material-icons mr-2 text-sm">delete</span>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 mt-1">
        {formatDate(thought.createdAt)}
      </p>
      
      {thought.type === "text" && thought.content && (
        <p className="journal-content mt-3 text-sm line-clamp-2">{thought.content}</p>
      )}
      
      {thought.type === "audio" && thought.mediaUrl && (
        <div className="mt-3">
          <AudioPlayer src={thought.mediaUrl} />
        </div>
      )}
      
      {thought.type === "video" && thought.mediaUrl && (
        <div className="mt-3">
          {/* Try to extract thumbnailUrl from metadata if available */}
          {thought.metadata ? (
            (() => {
              try {
                const metadata = JSON.parse(thought.metadata);
                if (metadata?.thumbnailUrl) {
                  // Use state to toggle between thumbnail and video player
                  const [showVideo, setShowVideo] = useState(false);
                  
                  return showVideo ? (
                    <VideoPlayer src={thought.mediaUrl} />
                  ) : (
                    <div className="relative cursor-pointer" onClick={() => setShowVideo(true)}>
                      <img 
                        src={metadata.thumbnailUrl} 
                        alt="Video thumbnail" 
                        className="w-full h-auto rounded-md mb-2" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button 
                          className="p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-opacity"
                          aria-label="Play video"
                        >
                          <span className="material-icons">play_arrow</span>
                        </button>
                      </div>
                    </div>
                  );
                }
              } catch (e) {
                console.error("Failed to parse metadata:", e);
              }
              // Fallback to video player if no valid thumbnail
              return <VideoPlayer src={thought.mediaUrl} />;
            })()
          ) : (
            <VideoPlayer src={thought.mediaUrl} />
          )}
        </div>
      )}
      
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center text-xs text-gray-500">
          {thought.visibility === "scheduled" ? (
            <>
              <span className="material-icons text-sm mr-1">schedule_send</span>
              <div>
                <div>Scheduled: {formatDate(thought.schedule?.deliveryDate)}</div>
                {thought.schedule?.contactId && thought.schedule.contact && (
                  <div className="mt-1 text-xs inline-flex items-center">
                    <span className="material-icons text-xs mr-1">person</span>
                    To: {thought.schedule.contact.name}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="material-icons text-sm mr-1">visibility</span>
              <span>Private</span>
            </>
          )}
        </div>
        <div className="flex items-center">
          <span className={cn(
            "inline-block w-2 h-2 rounded-full mr-1",
            thought.type === "text" ? "bg-secondary" : 
            thought.type === "audio" ? "bg-accent" : "bg-primary"
          )}></span>
          <span className="text-xs">
            {thought.type === "text" ? "Text Note" : 
             thought.type === "audio" ? "Voice Note" : "Video Note"}
          </span>
        </div>
      </div>
    </div>
  );
}
