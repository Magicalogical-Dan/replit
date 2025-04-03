import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const [location, setLocation] = useLocation();

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    
    // Update URL
    switch(tab) {
      case "home":
        setLocation("/");
        break;
      case "create":
        setLocation("/create");
        break;
      case "schedule":
        setLocation("/schedule");
        break;
      case "thoughts":
        setLocation("/insights");
        break;
      case "contacts":
        setLocation("/contacts");
        break;
      case "profile":
        setLocation("/profile");
        break;
    }
  };

  return (
    <nav className="bg-white border-t border-gray-200 pb-safe-bottom">
      <div className="flex justify-around">
        <button 
          className={cn(
            "flex flex-col items-center justify-center py-3 px-5",
            activeTab === "home" ? "text-primary" : "text-gray-500"
          )}
          onClick={() => handleTabChange("home")}
        >
          <span className="material-icons">home</span>
          <span className="text-xs mt-1">Home</span>
        </button>
        
        <button 
          className={cn(
            "flex flex-col items-center justify-center py-3 px-5",
            activeTab === "schedule" ? "text-primary" : "text-gray-500"
          )}
          onClick={() => handleTabChange("schedule")}
        >
          <span className="material-icons">schedule</span>
          <span className="text-xs mt-1">Scheduled</span>
        </button>
        
        <div className="relative flex items-center justify-center">
          <button 
            className="absolute bottom-5 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg"
            onClick={() => handleTabChange("create")}
          >
            <span className="material-icons">add</span>
          </button>
        </div>
        
        <button 
          className={cn(
            "flex flex-col items-center justify-center py-3 px-5",
            activeTab === "contacts" ? "text-primary" : "text-gray-500"
          )}
          onClick={() => handleTabChange("contacts")}
        >
          <span className="material-icons">contacts</span>
          <span className="text-xs mt-1">Contacts</span>
        </button>
        
        <button 
          className={cn(
            "flex flex-col items-center justify-center py-3 px-5",
            activeTab === "profile" ? "text-primary" : "text-gray-500"
          )}
          onClick={() => handleTabChange("profile")}
        >
          <span className="material-icons">person</span>
          <span className="text-xs mt-1">Profile</span>
        </button>
      </div>
    </nav>
  );
}
