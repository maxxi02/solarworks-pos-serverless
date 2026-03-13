"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Loader2, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Story {
  _id: string;
  authorName: string;
  title: string;
  description?: string;
  images: string[];
  likedBy: string[];
  createdAt: string;
}

export default function StoriesManagementPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchStories = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/stories?limit=100");
      if (!res.ok) throw new Error("Failed to fetch stories");
      const data = await res.json();
      setStories(data.stories);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load stories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this story? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/stories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete story");
      
      toast.success("Story deleted");
      setStories(stories.filter((s) => s._id !== id));
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while deleting the story.");
    }
  };

  const handleEditStart = (story: Story) => {
    setEditingId(story._id);
    setEditTitle(story.title);
    setEditDesc(story.description || "");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDesc("");
  };

  const handleEditSave = async (id: string) => {
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      setIsUpdating(true);
      const res = await fetch(`/api/stories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
        }),
      });

      if (!res.ok) throw new Error("Failed to update story");

      toast.success("Story updated");
      setStories(stories.map(s => s._id === id ? { ...s, title: editTitle, description: editDesc } : s));
      setEditingId(null);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while updating the story.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Stories Management</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stories.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No stories have been posted yet.
          </div>
        ) : (
          stories.map((story) => {
            const isEditing = editingId === story._id;

            return (
              <Card key={story._id} className="overflow-hidden flex flex-col pt-3">
                <CardHeader className="p-4 pt-0">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{story.authorName}</CardTitle>
                      <CardDescription className="text-xs">
                        {format(new Date(story.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {story.likedBy.length} Likes
                    </Badge>
                  </div>
                </CardHeader>
                
                <div className="relative w-full aspect-square bg-muted">
                  <Image 
                    src={story.images[0]} 
                    alt="Story image" 
                    fill 
                    className="object-cover" 
                  />
                  {story.images.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                      1/{story.images.length}
                    </div>
                  )}
                </div>

                <CardContent className="flex-1 p-4 flex flex-col gap-3">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input 
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                      />
                      <textarea
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring italic"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description (optional)"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" size="sm" onClick={handleEditCancel} disabled={isUpdating}>
                          <X className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleEditSave(story._id)} disabled={isUpdating}>
                          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{story.title}</p>
                      {story.description && (
                         <p className="text-muted-foreground text-sm italic mt-1 line-clamp-3">
                           "{story.description}"
                         </p>
                      )}
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-2 pt-2 border-t mt-auto">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => handleEditStart(story)}
                      >
                        <Edit2 className="h-3 w-3 mr-2" /> Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => handleDelete(story._id)}
                      >
                        <Trash2 className="h-3 w-3 mr-2" /> Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
