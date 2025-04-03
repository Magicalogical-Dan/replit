import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EntryWithSchedule } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface InsightsScreenProps {
  isActive: boolean;
}

export default function InsightsScreen({ isActive }: InsightsScreenProps) {
  // Fetch all entries
  const { data: entries } = useQuery<EntryWithSchedule[]>({
    queryKey: ["/api/entries-with-schedules"],
    enabled: isActive,
  });
  
  // Calculate stats
  const totalEntries = entries?.length || 0;
  const textEntries = entries?.filter(e => e.type === "text").length || 0;
  const audioEntries = entries?.filter(e => e.type === "audio").length || 0;
  const videoEntries = entries?.filter(e => e.type === "video").length || 0;
  const scheduledEntries = entries?.filter(e => e.visibility === "scheduled").length || 0;
  
  // Create data for charts
  const typeData = [
    { name: "Text", value: textEntries, fill: "#10b981" },
    { name: "Audio", value: audioEntries, fill: "#f59e0b" },
    { name: "Video", value: videoEntries, fill: "#6366f1" },
  ];
  
  // Average words per text entry (simplified example)
  const avgWordsData = [
    { name: "Week 1", words: 120 },
    { name: "Week 2", words: 150 },
    { name: "Week 3", words: 200 },
    { name: "Week 4", words: 180 },
  ];
  
  if (!isActive) return null;

  return (
    <div className="px-4 py-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Insights</h1>
        <div className="flex space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Filter">
            <span className="material-icons">filter_list</span>
          </button>
        </div>
      </header>

      <div className="stats grid grid-cols-3 gap-3 mb-6">
        <div className="stat bg-white rounded-lg shadow p-3 text-center">
          <p className="text-2xl font-semibold text-primary">{totalEntries}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="stat bg-white rounded-lg shadow p-3 text-center">
          <p className="text-2xl font-semibold text-accent">{scheduledEntries}</p>
          <p className="text-xs text-gray-500">Scheduled</p>
        </div>
        <div className="stat bg-white rounded-lg shadow p-3 text-center">
          <p className="text-2xl font-semibold text-secondary">{textEntries}</p>
          <p className="text-xs text-gray-500">Text Notes</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-medium mb-4">Types of Notes</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={typeData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" nameKey="name" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-medium mb-4">Writing Activity</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={avgWordsData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="words" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-medium mb-3">Usage Tips</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• Try to write at least one entry per day for best results</p>
          <p>• Voice notes are great for capturing ideas on the go</p>
          <p>• Schedule messages to your future self for motivation</p>
        </div>
      </div>
    </div>
  );
}
