import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomeScreen from "@/pages/HomeScreen";
import CreateScreen from "@/pages/CreateScreen";
import ScheduleScreen from "@/pages/ScheduleScreen";
import ProfileScreen from "@/pages/ProfileScreen";
import InsightsScreen from "@/pages/InsightsScreen";
import ContactsScreen from "@/pages/ContactsScreen";
import BottomNavigation from "@/components/BottomNavigation";
import TextNoteModal from "@/modals/TextNoteModal";
import AudioRecorderModal from "@/modals/AudioRecorderModal";
import VideoRecorderModal from "@/modals/VideoRecorderModal";
import ScheduleSendModal from "@/modals/ScheduleSendModal";
import { Entry } from "@shared/schema";

function Router() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [isTextModalOpen, setIsTextModalOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Used to handle creating new entries
  const openTextModal = () => {
    setSelectedEntry(null);
    setIsTextModalOpen(true);
  };

  const openAudioModal = () => {
    setSelectedEntry(null);
    setIsAudioModalOpen(true);
  };

  const openVideoModal = () => {
    setSelectedEntry(null);
    setIsVideoModalOpen(true);
  };

  // Used for editing existing entries
  const editEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    
    if (entry.type === "text") {
      setIsTextModalOpen(true);
    } else if (entry.type === "audio") {
      setIsAudioModalOpen(true);
    } else if (entry.type === "video") {
      setIsVideoModalOpen(true);
    }
  };

  // Used for scheduling an entry
  const scheduleEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setIsScheduleModalOpen(true);
  };

  // Close all modals
  const closeAllModals = () => {
    setIsTextModalOpen(false);
    setIsAudioModalOpen(false);
    setIsVideoModalOpen(false);
    setIsScheduleModalOpen(false);
  };

  return (
    <>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Status Bar Spacer */}
        <div className="bg-white pt-safe-top"></div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-2">
          <Switch>
            <Route 
              path="/" 
              component={() => <HomeScreen 
                isActive={activeTab === "home"} 
                onEditEntry={editEntry} 
                onScheduleEntry={scheduleEntry} 
              />} 
            />
            <Route 
              path="/create" 
              component={() => <CreateScreen 
                isActive={activeTab === "create"} 
                onCreateText={openTextModal} 
                onCreateAudio={openAudioModal} 
                onCreateVideo={openVideoModal}
                setActiveTab={setActiveTab}
              />} 
            />
            <Route 
              path="/schedule" 
              component={() => <ScheduleScreen isActive={activeTab === "schedule"} onEditEntry={editEntry} />} 
            />
            <Route 
              path="/insights" 
              component={() => <InsightsScreen isActive={activeTab === "thoughts"} />} 
            />
            <Route 
              path="/contacts" 
              component={() => <ContactsScreen isActive={activeTab === "contacts"} />} 
            />
            <Route 
              path="/profile" 
              component={() => <ProfileScreen isActive={activeTab === "profile"} />} 
            />
            <Route component={NotFound} />
          </Switch>
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Modals */}
        <TextNoteModal 
          isOpen={isTextModalOpen} 
          onClose={closeAllModals} 
          entry={selectedEntry}
          onSchedule={scheduleEntry} 
        />
        <AudioRecorderModal 
          isOpen={isAudioModalOpen} 
          onClose={closeAllModals} 
          entry={selectedEntry}
          onSchedule={scheduleEntry} 
        />
        <VideoRecorderModal 
          isOpen={isVideoModalOpen} 
          onClose={closeAllModals} 
          entry={selectedEntry}
          onSchedule={scheduleEntry} 
        />
        <ScheduleSendModal 
          isOpen={isScheduleModalOpen} 
          onClose={closeAllModals} 
          entry={selectedEntry} 
        />
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
