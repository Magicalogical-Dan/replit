import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryTabs({ 
  activeCategory, 
  onCategoryChange 
}: CategoryTabsProps) {
  // Built-in categories
  const builtInCategories = [
    { id: "all", name: "All Thoughts" },
    { id: "text", name: "Text Notes" },
    { id: "audio", name: "Voice Notes" },
    { id: "video", name: "Video Notes" },
    { id: "scheduled", name: "Scheduled" }
  ];
  
  // Fetch custom categories from API
  const { data: customCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const categories = [...builtInCategories, ...(customCategories || [])];

  return (
    <div className="category-tabs mb-4 overflow-x-auto no-scrollbar">
      <div className="flex space-x-2 pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            className={cn(
              "px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap",
              activeCategory === category.id 
                ? "bg-primary text-white" 
                : "bg-white text-darkGray"
            )}
            onClick={() => onCategoryChange(category.id.toString())}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
