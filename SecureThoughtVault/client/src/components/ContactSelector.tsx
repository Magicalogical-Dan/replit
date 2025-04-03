import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Contact } from "@shared/schema";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContactSelectorProps {
  selectedContactId: number | null;
  onContactSelect: (contactId: number) => void;
}

export default function ContactSelector({ 
  selectedContactId, 
  onContactSelect 
}: ContactSelectorProps) {
  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const handleChange = (value: string) => {
    onContactSelect(parseInt(value));
  };

  return (
    <div className="mb-6">
      <Label className="block text-sm font-medium text-gray-700 mb-1">Select Contact</Label>
      <div className="relative">
        <Select
          value={selectedContactId?.toString() || ""}
          onValueChange={handleChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full p-2 border border-gray-300 rounded-lg">
            <SelectValue placeholder="Select from contacts" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Contacts</SelectLabel>
              {contacts?.map((contact) => (
                <SelectItem key={contact.id} value={contact.id.toString()}>
                  {contact.name}{contact.phoneNumber ? ` (${contact.phoneNumber})` : ''}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
