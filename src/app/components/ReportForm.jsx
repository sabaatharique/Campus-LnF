import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Calendar, Upload, Loader2, X } from "lucide-react";
import { supabase } from "../../supabase";
import { toast } from "sonner";

const getDraftKey = (type, userId) => `campus-lnf:report-draft:${type}:${userId}`;

const readDraft = (draftKey) => {
  if (typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(draftKey);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Failed to restore report draft:", error);
    return null;
  }
};

export function ReportForm({ type, userId, onSubmit, onCancel }) {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [locations, setLocations] = useState([]);
  const [tags, setTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const draftKey = getDraftKey(type, userId);

  useEffect(() => {
    // Generate previews when imageFiles changes
    const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);

    // Clean up previews to avoid memory leaks
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  useEffect(() => {
    const draft = readDraft(draftKey);
    if (draft) {
      setItemName(draft.itemName || "");
      setCategory(draft.category || "");
      setDescription(draft.description || "");
      setLocation(draft.location || "");
      setDate(draft.date || "");
    } else {
      setItemName("");
      setCategory("");
      setDescription("");
      setLocation("");
      setDate("");
    }
  }, [draftKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const draftPayload = { itemName, category, description, location, date };
    const hasContent = Object.values(draftPayload).some((value) => Boolean(value));

    if (!hasContent) {
      window.localStorage.removeItem(draftKey);
      return;
    }

    window.localStorage.setItem(draftKey, JSON.stringify(draftPayload));
  }, [draftKey, itemName, category, description, location, date]);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data, error } = await supabase.rpc('get_locations');
      if (error) console.error('Error fetching locations:', error);
      else setLocations(data);
    };

    const fetchTags = async () => {
      const { data, error } = await supabase.rpc('get_tags');
      if (error) console.error('Error fetching tags:', error);
      else setTags(data);
    };

    fetchLocations();
    fetchTags();
  }, []);

  const handleRemoveImage = (indexToRemove) => {
    setImageFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation for found reports
    if (type === 'found' && imageFiles.length === 0) {
      toast.error('Found reports MUST include at least one clear image of the item');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Upload images and get public URLs
      const imageUrls = [];
      if (imageFiles.length > 0) {
        toast.info('Uploading images...');
        for (const file of imageFiles) {
          const fileName = `${type}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("lnf-images")
            .upload(fileName, file);
          
          if (uploadError) {
            console.error("Error uploading image:", uploadError);
            continue;
          }

          const { data } = supabase.storage.from("lnf-images").getPublicUrl(fileName);
          if (data?.publicUrl) imageUrls.push(data.publicUrl);
        }
      }

      // 2. Create report object
      const report = {
        creator_id: userId,
        title: itemName,
        description,
        tags: [parseInt(category)],
        image_urls: imageUrls,
      };

      const [year, month, day] = date.split('-');
      const localDate = new Date(year, month - 1, day);

      if (type === 'lost') {
        report.last_location_id = parseInt(location);
        report.lost_at = localDate.toISOString();
      } else {
        report.found_location_id = parseInt(location);
        report.found_at = localDate.toISOString();
      }

      // 3. Send to backend API
      const endpoint = type === 'lost' ? '/api/lost/create' : '/api/found/create';
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create report');
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftKey);
      }

      // Success - immediately call onSubmit without waiting
      onSubmit(report);
    } catch (err) {
      console.error('Error submitting report:', err);
      toast.error(err.message || 'Failed to submit report');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-2xl border-slate-200">
      <CardHeader>
        <CardTitle>
          {type === "lost" ? "Report Lost Item" : "Report Found Item"}
        </CardTitle>
        <CardDescription>
          {type === "lost"
            ? "Help us find your lost item by providing details"
            : "Help reunite someone with their lost item"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-3">
            <Label htmlFor="images" className="flex items-center gap-2 text-base font-semibold">
              <Upload className="size-4 text-primary" />
              Item Images {type === 'found' && <span className="text-red-500">*</span>}
            </Label>
            <div 
              className={`group relative cursor-pointer rounded-xl border border-dashed p-6 transition-colors duration-200
                ${type === 'found' && imageFiles.length === 0 ? 'border-red-300 bg-red-50/40 hover:border-red-400' : 'border-slate-300 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/50'}`}
              onClick={() => document.getElementById('images').click()}
            >
              <Input
                id="images"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setImageFiles(prev => [...prev, ...files]);
                  e.target.value = ''; // Reset value to allow re-selection
                }}
                accept="image/*"
              />
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <div className={`rounded-full p-4 transition-colors ${type === 'found' && imageFiles.length === 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Upload className="size-8" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      Click to upload images
                    </p>
                    <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-500">
                      {type === 'found' 
                        ? "Found items MUST have at least one clear image for verification" 
                        : "Add clear photos to help people recognize the item"}
                  </p>
                </div>
              </div>
            </div>

            {imageFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 md:grid-cols-5 animate-in fade-in duration-500">
                {imageFiles.map((file, index) => (
                  <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-white shadow-sm transition-all duration-200 hover:shadow-md">
                    <img
                      src={previews[index]}
                      alt={`Preview ${index}`}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(index);
                        }}
                        className="rounded-full bg-red-500 p-2 text-white shadow-sm transition hover:bg-red-600 active:scale-95"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="item-name">Title</Label>
            <Input
              id="item-name"
              type="text"
              placeholder="e.g., Black iPhone 13"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.tag_id} value={tag.tag_id.toString()}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed description (color, brand, unique features, etc.)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{type === "lost" ? "Last Seen Location" : "Found Location"}</Label>
            <Select value={location} onValueChange={setLocation} required>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.location_id} value={loc.location_id.toString()}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{type === "lost" ? "Date Lost" : "Date Found"}</Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
