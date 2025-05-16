import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Module, insertModuleSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

// Extend the module schema for form validation
const moduleFormSchema = insertModuleSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().min(1, "Icon is required"),
  estimatedHours: z.number().min(1, "Estimated hours must be at least 1"),
  order: z.number().min(1, "Order must be at least 1")
});

type ModuleFormValues = z.infer<typeof moduleFormSchema>;

export default function AdminPage() {
  const { user, isDemoMode } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  // Fetch all modules
  const { data: modules, isLoading: loadingModules } = useQuery<Module[]>({
    queryKey: ["/api/modules"],
  });

  // Setup form for creating/editing modules
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: "",
      description: "",
      icon: "school",
      estimatedHours: 1,
      order: 1
    }
  });

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleFormValues) => {
      const response = await apiRequest("POST", "/api/modules", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      toast({
        title: "Success",
        description: "Module created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create module: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: ModuleFormValues) => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Module creation is disabled in demo mode",
      });
      return;
    }
    
    // If we're editing a module, add the ID
    if (selectedModule) {
      // TODO: Add update mutation when needed
      toast({
        title: "Not Implemented",
        description: "Editing modules is not implemented yet",
      });
      return;
    }
    
    createModuleMutation.mutate(data);
  };

  // Open dialog for creating a new module
  const handleNewModule = () => {
    setSelectedModule(null);
    form.reset({
      title: "",
      description: "",
      icon: "school",
      estimatedHours: 1,
      order: modules && modules.length > 0 ? Math.max(...modules.map(m => m.order)) + 1 : 1
    });
    setIsDialogOpen(true);
  };

  // Common icons for digital marketing
  const commonIcons = [
    { name: "school", label: "School" },
    { name: "search", label: "Search" },
    { name: "groups", label: "Social Media" },
    { name: "campaign", label: "Campaign" },
    { name: "analytics", label: "Analytics" },
    { name: "email", label: "Email" },
    { name: "language", label: "Web" },
    { name: "edit_document", label: "Content" },
    { name: "shopping_cart", label: "E-commerce" },
    { name: "bar_chart", label: "Statistics" }
  ];

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Course Module Management</h1>
          <p className="text-neutral-gray">Add, edit, or remove digital marketing course modules</p>
        </div>
        <Button onClick={handleNewModule}>
          <span className="material-icons mr-2">add</span>
          Create New Module
        </Button>
      </div>

      <Separator className="my-6" />

      {loadingModules ? (
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules && modules.map((module) => (
            <Card key={module.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="bg-neutral-light">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-primary text-2xl">
                    {module.icon || "school"}
                  </span>
                  <div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <CardDescription>Order: {module.order} • {module.estimatedHours} hours</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-neutral-dark text-sm">{module.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between border-t bg-neutral-lightest py-3">
                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: "Not Implemented",
                    description: "Editing modules is not implemented yet",
                  });
                }}>
                  <span className="material-icons text-sm mr-1">edit</span>
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-neutral-dark hover:text-destructive" onClick={() => {
                  toast({
                    title: "Not Implemented",
                    description: "Deleting modules is not implemented yet",
                  });
                }}>
                  <span className="material-icons text-sm mr-1">delete</span>
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Module Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedModule ? "Edit Module" : "Create New Module"}</DialogTitle>
            <DialogDescription>
              {selectedModule ? "Update the details for this module" : "Add a new course module for digital marketing education"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Introduction to SEO" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Learn the fundamentals of search engine optimization"
                        className="resize-none h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Icon</FormLabel>
                      <FormControl>
                        <select
                          className="w-full rounded-md border border-input px-3 py-2 text-sm"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          {commonIcons.map((icon) => (
                            <option key={icon.name} value={icon.name}>
                              {icon.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createModuleMutation.isPending || isDemoMode}
                >
                  {createModuleMutation.isPending && (
                    <span className="animate-spin mr-2">
                      <span className="material-icons text-sm">progress_activity</span>
                    </span>
                  )}
                  {selectedModule ? "Update Module" : "Create Module"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}