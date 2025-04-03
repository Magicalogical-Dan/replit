import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { User } from "@shared/schema";

interface ProfileScreenProps {
  isActive: boolean;
}

export default function ProfileScreen({ isActive }: ProfileScreenProps) {
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Fetch user data and stats
  const { data: user } = useQuery<User>({
    queryKey: ["/api/users/me"],
    enabled: isActive,
  });
  
  // Calculate stats (in a real app, these would come from the server)
  const stats = {
    totalThoughts: 24,
    scheduled: 12,
    delivered: 5,
  };
  
  if (!isActive) return null;

  return (
    <div className="px-4 py-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <button className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Settings">
          <span className="material-icons">settings</span>
        </button>
      </header>

      <div className="profile-content bg-white rounded-lg shadow p-5 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold mr-4">
            {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.displayName || "Demo User"}</h2>
            <p className="text-gray-500">{user?.email || "demo@example.com"}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <span className="material-icons text-gray-500 mr-3">cloud_upload</span>
              <span>Backup & Sync</span>
            </div>
            <div className="flex items-center">
              <Switch
                checked={backupEnabled}
                onCheckedChange={setBackupEnabled}
              />
            </div>
          </div>

          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <span className="material-icons text-gray-500 mr-3">fingerprint</span>
              <span>Biometric Lock</span>
            </div>
            <div className="flex items-center">
              <Switch
                checked={biometricEnabled}
                onCheckedChange={setBiometricEnabled}
              />
            </div>
          </div>

          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <span className="material-icons text-gray-500 mr-3">notifications</span>
              <span>Notifications</span>
            </div>
            <div className="flex items-center">
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium">App Statistics</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-primary">{stats.totalThoughts}</p>
              <p className="text-xs text-gray-500">Total Thoughts</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-secondary">{stats.scheduled}</p>
              <p className="text-xs text-gray-500">Scheduled</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-accent">{stats.delivered}</p>
              <p className="text-xs text-gray-500">Delivered</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <button className="w-full p-4 text-left flex items-center text-gray-700 hover:bg-gray-50 transition-colors">
          <span className="material-icons text-gray-500 mr-3">help_outline</span>
          <span>Help & Support</span>
        </button>
        <button className="w-full p-4 text-left flex items-center text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-200">
          <span className="material-icons text-gray-500 mr-3">privacy_tip</span>
          <span>Privacy Policy</span>
        </button>
        <button className="w-full p-4 text-left flex items-center text-danger hover:bg-gray-50 transition-colors border-t border-gray-200">
          <span className="material-icons text-danger mr-3">logout</span>
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
