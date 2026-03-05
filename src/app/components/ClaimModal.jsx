import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog.jsx";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea.jsx";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Loader2, Send, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../supabase";

const getClaimDraftKey = (report, userId) =>
  `campus-lnf:claim-draft:${report?.type || "unknown"}:${report?.dbId || report?.id || "new"}:${userId}`;

export function ClaimModal({ isOpen, onClose, report, userId }) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const draftKey = getClaimDraftKey(report, userId);

  useEffect(() => {
    const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    return () => newPreviews.forEach(url => URL.revokeObjectURL(url));
  }, [imageFiles]);

  useEffect(() => {
    if (typeof window === "undefined" || !report) return;

    try {
      const saved = window.localStorage.getItem(draftKey);
      setMessage(saved || "");
    } catch (error) {
      console.error("Failed to restore claim draft:", error);
    }
  }, [draftKey, report]);

  useEffect(() => {
    if (typeof window === "undefined" || !report) return;

    if (!message.trim()) {
      window.localStorage.removeItem(draftKey);
      return;
    }

    window.localStorage.setItem(draftKey, message);
  }, [draftKey, message, report]);

  const handleRemoveImage = (indexToRemove) => {
    setImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mandatory image for 'lost' reports (Return Reports)
    if (report?.type === 'lost' && imageFiles.length === 0) {
      toast.error('Please upload at least one image of the item you found');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload images if any
      const imageUrls = [];
      if (imageFiles.length > 0) {
        toast.info('Uploading images...');
        for (const file of imageFiles) {
          const folder = report.type === 'lost' ? 'return' : 'claim';
          const fileName = `${folder}/${Date.now()}_${file.name}`;
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

      // 2. Determine the endpoint based on report type
      const endpoint = report.type === 'found' 
        ? 'http://localhost:3000/api/claims/create/found'
        : 'http://localhost:3000/api/claims/create/lost';
      
      const payload = report.type === 'found'
        ? {
            requester_id: userId,
            found_report_id: report.dbId || report.id,
            message: message,
            image_urls: imageUrls
          }
        : {
            requester_id: userId,
            lost_report_id: report.dbId || report.id,
            message: message,
            image_urls: imageUrls
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send claim request');
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftKey);
      }

      toast.success(report.type === 'lost' ? 'Return report sent successfully!' : 'Claim request sent successfully!');
      setMessage("");
      setImageFiles([]);
      onClose();
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 overflow-hidden border border-slate-200 flex flex-col">
        <DialogHeader className="p-6 pb-2 space-y-3">
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {report?.type === 'found' ? 'Claim This Found Item' : 'I Found This Item'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {report?.type === 'found' 
              ? (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                  Send a message to <span className="font-bold text-gray-800">{report?.userName}</span> requesting to claim: <span className="font-bold text-blue-700">{report?.itemName}</span>
                </div>
              ) 
              : (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                  Notify <span className="font-bold text-gray-800">{report?.userName}</span> that you found their item: <span className="font-bold text-green-700">{report?.itemName}</span>
                </div>
              )
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {/* Image Upload Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Upload className="size-4 text-blue-600" />
                Upload Photos {report?.type === 'lost' && <span className="text-red-500">*</span>}
              </Label>
              <div 
                className={`group relative cursor-pointer rounded-xl border border-dashed p-6 transition-colors duration-200
                  ${report?.type === 'lost' && imageFiles.length === 0 ? 'border-red-300 bg-red-50/40 hover:border-red-400' : 'border-slate-300 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/50'}`}
                onClick={() => document.getElementById('claim-images').click()}
              >
                <Input
                  id="claim-images"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setImageFiles(prev => [...prev, ...files]);
                    e.target.value = '';
                  }}
                  accept="image/*"
                />
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <div className={`p-3 rounded-full transition-colors ${report?.type === 'lost' && imageFiles.length === 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Upload className="size-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">
                      Click to upload images
                    </p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      {report?.type === 'lost' 
                        ? "Mandatory: Upload a photo of the item you found to help the owner verify it" 
                        : "Optional: Add photos to help verify your claim"}
                    </p>
                  </div>
                </div>
              </div>

              {imageFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 animate-in fade-in duration-500">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-white shadow-sm">
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
                          className="rounded-full bg-red-500 p-1.5 text-white shadow-sm transition hover:bg-red-600"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="message" className="text-base font-semibold">
                Your Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                placeholder={
                  report?.type === 'found'
                    ? "Describe why this item is yours (e.g., color, brand, unique features, where you lost it...)"
                    : "Describe the item you found (e.g., where you found it, color, brand, condition...)"
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                required
                className="resize-none border-2 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 rounded-xl text-base"
              />
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200">
                {report?.type === 'found'
                  ? "Provide details to help the owner verify that you are the rightful owner."
                  : "Provide details to help the owner identify their lost item."
                }
              </p>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2 bg-gray-50 border-t border-gray-100 gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
              className="border-2 hover:bg-gray-100 font-semibold"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !message.trim()}
              className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl font-bold px-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="size-5 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
