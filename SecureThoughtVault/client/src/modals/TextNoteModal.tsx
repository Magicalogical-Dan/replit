import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Entry } from "@shared/schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { insertEntrySchema } from "@shared/schema";

interface TextNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry | null;
  onSchedule: (entry: Entry) => void;
}

const formSchema = insertEntrySchema.pick({
  title: true,
  content: true,
  visibility: true,
  categoryId: true,
}).extend({
  title: z.string().min(1, "Title is required"),
});

export default function TextNoteModal({ isOpen, onClose, entry, onSchedule }: TextNoteModalProps) {
  const { toast } = useToast();
  const isEditing = !!entry;
  
  // Get categories for dropdown
  interface Category {
    id: number;
    name: string;
    userId: number;
  }
  
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    initialData: [] as Category[], // Provide initial data to avoid TypeScript errors
  });
  
  // Set up form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: entry?.title || "",
      content: entry?.content || "",
      visibility: entry?.visibility || "private",
      categoryId: entry?.categoryId || undefined,
    },
  });
  
  // Reset form when entry changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: entry?.title || "",
        content: entry?.content || "",
        visibility: entry?.visibility || "private",
        categoryId: entry?.categoryId || undefined,
      });
    }
  }, [isOpen, entry, form]);
  
  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const payload = {
        ...data,
        type: "text",
        visibility: "private", // Always save as private initially
        userId: 1,
      };
      const response = await apiRequest("POST", "/api/entries", payload);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      
      toast({
        title: "Success", 
        description: "Your text note has been saved. You can schedule it from your library.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save note: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const payload = {
        ...data,
        visibility: "private", // Always set to private
      };
      const response = await apiRequest("PATCH", `/api/entries/${entry?.id}`, payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries-with-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-entries"] });
      toast({
        title: "Success",
        description: "Your text note has been updated.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update note: ${error}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  
  const handleSave = () => {
    // Save the note directly
    form.handleSubmit(onSubmit)();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-lg w-[calc(100%-2rem)] max-w-md max-h-[85vh] mx-auto flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <button 
            className="p-1 rounded-full hover:bg-gray-200" 
            aria-label="Close"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
          <h2 className="font-semibold text-lg">{isEditing ? "Edit Text Note" : "New Text Note"}</h2>
          <button className="p-1 rounded-full hover:bg-gray-200" aria-label="More options">
            <span className="material-icons">more_vert</span>
          </button>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-4 flex-1 overflow-y-auto">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Title"
                        className="w-full mb-4 p-2 text-lg font-medium focus:outline-none border-b border-gray-200"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Write your thoughts here..."
                        className="w-full h-[30vh] p-2 focus:outline-none journal-content resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                <h3 className="font-medium mb-2">Options</h3>
                
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-700 mb-2">
                    First save your note. Then from your library, you can schedule it to be sent later.
                  </p>
                  <div className="flex items-center text-xs text-blue-600">
                    <span className="material-icons text-xs mr-1">info</span>
                    <span>All notes are private until you schedule them</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-gray-500 mr-2">label</span>
                    <span>Category</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border border-gray-300 rounded px-2 py-1 text-sm w-40">
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button 
                type="button" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 
                  "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
