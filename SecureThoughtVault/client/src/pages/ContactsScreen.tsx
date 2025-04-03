import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Contact, insertContactSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ContactsScreenProps {
  isActive: boolean;
}

const formSchema = insertContactSchema.pick({
  name: true,
  phoneNumber: true,
  email: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
});

export default function ContactsScreen({ isActive }: ContactsScreenProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: isActive,
  });
  
  // Set up form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      email: "",
    },
  });
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/contacts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact added",
        description: "Contact has been added successfully.",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add contact: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; contact: z.infer<typeof formSchema> }) => {
      const response = await apiRequest("PATCH", `/api/contacts/${data.id}`, data.contact);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact updated",
        description: "Contact has been updated successfully.",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update contact: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/contacts/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact deleted",
        description: "Contact has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete contact: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, contact: data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  const handleAddContact = () => {
    form.reset({
      name: "",
      phoneNumber: "",
      email: "",
    });
    setEditingContact(null);
    setIsAddDialogOpen(true);
  };
  
  const handleEditContact = (contact: Contact) => {
    form.reset({
      name: contact.name,
      phoneNumber: contact.phoneNumber || "",
      email: contact.email || "",
    });
    setEditingContact(contact);
    setIsAddDialogOpen(true);
  };
  
  const handleDeleteContact = (id: number) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      deleteMutation.mutate(id);
    }
  };
  
  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingContact(null);
  };
  
  if (!isActive) return null;
  
  return (
    <div className="px-4 py-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button 
          onClick={handleAddContact}
          className="flex items-center gap-1"
        >
          <span className="material-icons text-sm">add</span>
          Add Contact
        </Button>
      </header>
      
      {isLoading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : contacts.length > 0 ? (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div 
              key={contact.id} 
              className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
            >
              <div>
                <h3 className="font-medium text-lg">{contact.name}</h3>
                <div className="text-gray-500 text-sm mt-1">
                  {contact.phoneNumber && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className="material-icons text-sm">phone</span>
                      <span>{contact.phoneNumber}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-sm">email</span>
                      <span>{contact.email}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  onClick={() => handleEditContact(contact)}
                >
                  <span className="material-icons text-gray-500">edit</span>
                </button>
                <button 
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  onClick={() => handleDeleteContact(contact.id)}
                >
                  <span className="material-icons text-gray-500">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="material-icons text-4xl text-gray-400 mb-2">person_off</span>
          <p className="text-gray-500">No contacts added yet</p>
          <p className="text-gray-400 text-sm mt-1">Tap the + button to add your first contact</p>
        </div>
      )}
      
      {/* Add/Edit Contact Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? "Saving..." 
                    : editingContact ? "Update" : "Add"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}