import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge.jsx";
import { ItemDetailModal } from "@/app/components/ItemDetailModal.jsx";
import { ArrowLeft, User, Mail, Phone, IdCard, Pencil, Save, X, Package, ClipboardList, HandHeart, RotateCcw, Search, Archive, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const getProfileHistoryFilterKey = (userId) => `campus-lnf:profile-history-filter:${userId}`;

const readProfileHistoryFilter = (userId) => {
  if (typeof window === "undefined") return "all";

  try {
    const saved = window.localStorage.getItem(getProfileHistoryFilterKey(userId));
    return saved || "all";
  } catch {
    return "all";
  }
};

const TYPE_CONFIG = {
  lost: {
    label: "Lost Report",
    icon: Package,
    color: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  found: {
    label: "Found Report",
    icon: Search,
    color: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  claim: {
    label: "Claim Request",
    icon: HandHeart,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  return: {
    label: "Return Request",
    icon: RotateCcw,
    color: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
};

const STATUS_CONFIG = {
  active:    { label: "Active",    color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700 border-blue-200" },
  expired:   { label: "Expired",   color: "bg-orange-100 text-orange-700 border-orange-200" },
  archived:  { label: "Archived",  color: "bg-gray-100 text-gray-600 border-gray-200" },
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  accepted:  { label: "Accepted",  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-700 border-red-200" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || { label: type, color: "bg-gray-100 text-gray-600 border-gray-200" };
  const Icon = cfg.icon || Package;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

export function ProfilePage({ user, onBack, onUpdateUser }) {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [saving, setSaving] = useState(false);

  // history filter & modal
  const [historyFilter, setHistoryFilter] = useState(() => readProfileHistoryFilter(user.id));
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // Map a history row → the shape ItemDetailModal expects
  const mapHistoryToReport = (item) => ({
    id: `${item.report_type}-${item.history_id}`,
    dbId: item.history_id,
    type: item.report_type,
    itemName: item.title || "Untitled",
    description: item.description || "",
    location: item.location_name || "Unknown location",
    date: item.reported_at,
    status: item.status,
    imageUrl: item.image_url || null,
    imageUrls: item.image_url ? [item.image_url] : [],
    category: item.category,
    userId: item.creator_id || user.id,
    userName: item.creator_name || "",
    userEmail: item.creator_email || "",
    userStudentId: item.creator_student_id || "",
    userContactNumber: item.creator_contact_number || "",
  });

  useEffect(() => {
    fetchProfile();
    fetchHistory();
  }, [user.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getProfileHistoryFilterKey(user.id), historyFilter);
  }, [user.id, historyFilter]);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await fetch(`http://localhost:3000/api/users/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setProfile(data);
      setEditName(data.name || "");
      setEditContact(data.contact_number?.toString() || "");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`http://localhost:3000/api/users/${user.id}/history`);
      if (!res.ok) throw new Error("Failed to fetch history");
      setHistory(await res.json());
    } catch (err) {
      console.error(err);
      toast.error("Failed to load report history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    const contact = parseInt(editContact, 10);
    if (editContact && isNaN(contact)) {
      toast.error("Contact number must be a valid number");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`http://localhost:3000/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), contact_number: editContact ? contact : null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }
      toast.success("Profile updated!");
      setProfile((p) => ({ ...p, name: editName.trim(), contact_number: editContact ? contact : p.contact_number }));
      if (onUpdateUser) onUpdateUser({ name: editName.trim() });
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (e, item) => {
    e.stopPropagation();
    try {
      const endpoint = item.report_type === 'lost' 
        ? `http://localhost:3000/api/archive/lost/${item.history_id}`
        : `http://localhost:3000/api/archive/found/${item.history_id}`;

      const response = await fetch(endpoint, { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to archive item');
      }

      toast.success('Item archived successfully!');
      fetchHistory(); // Refresh the list
    } catch (error) {
      console.error('Error archiving item:', error);
      toast.error('Failed to archive item');
    }
  };

  const handleCancelEdit = () => {
    setEditName(profile?.name || "");
    setEditContact(profile?.contact_number?.toString() || "");
    setIsEditing(false);
  };

  const filteredHistory =
    historyFilter === "all"
      ? history
      : historyFilter === "archived"
      ? history.filter((h) => h.status === "archived")
      : historyFilter === "completed"
      ? history.filter((h) => h.status === "completed" || h.status === "accepted")
      : history.filter(
          (h) => h.report_type === historyFilter && h.status !== "archived"
        );

  const getInitials = (name) =>
    (name || "?")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      {/* Header — identical style to Dashboard */}
      <header className="bg-white border-b-2 border-blue-200 shadow-xl sticky top-0 z-10 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg hover:scale-105 transition-transform">
                <Package className="size-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Profile</h1>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  Manage your account and view your activity
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onBack}
              className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-400 transition-all shadow-md hover:shadow-lg border-2 font-semibold"
            >
              <ArrowLeft className="size-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Profile Card ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-blue-200 transition-all overflow-hidden">
          {/* Gradient accent bar */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500" />

          {loadingProfile ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profile ? (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">

                {/* Avatar */}
                <div className="shrink-0">
                  <div className="size-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-bold tracking-wide">
                      {getInitials(profile.name)}
                    </span>
                  </div>
                </div>

                {/* Fields */}
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-gray-900">Account Details</h2>
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="border-2 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 font-semibold transition-all"
                      >
                        <Pencil className="size-3.5 mr-1.5" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow"
                        >
                          <Save className="size-3.5 mr-1.5" />
                          {saving ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300 font-semibold"
                        >
                          <X className="size-3.5 mr-1.5" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name — editable */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="size-3.5" /> Full Name
                      </Label>
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl font-medium"
                          placeholder="Your full name"
                        />
                      ) : (
                        <p className="text-base font-semibold text-gray-900 bg-gray-50 rounded-xl px-3 py-2.5 border-2 border-transparent">
                          {profile.name}
                        </p>
                      )}
                    </div>

                    {/* Email — read-only */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="size-3.5" /> Email
                      </Label>
                      <p className="text-base font-medium text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border-2 border-transparent">
                        {profile.email}
                      </p>
                    </div>

                    {/* Student ID — read-only */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <IdCard className="size-3.5" /> Student ID
                      </Label>
                      <p className="text-base font-medium text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border-2 border-transparent">
                        {profile.student_id}
                      </p>
                    </div>

                    {/* Contact — editable */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="size-3.5" /> Contact Number
                      </Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editContact}
                          onChange={(e) => setEditContact(e.target.value)}
                          className="border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl font-medium"
                          placeholder="10-digit number"
                        />
                      ) : (
                        <p className="text-base font-medium text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border-2 border-transparent">
                          {profile.contact_number ?? <span className="text-gray-400 italic text-sm">Not set</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-gray-500">Failed to load profile.</div>
          )}
        </div>

        {/* ── Report History ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-blue-200 transition-all overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-purple-500 via-blue-400 to-indigo-500" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="size-5 text-blue-600" />
                Report History
              </h2>

              {/* Filter tabs — dashboard style */}
              <div className="flex gap-1 bg-white p-1.5 rounded-xl shadow border-2 border-gray-200 flex-wrap">
                {[
                  { value: "all",       label: "All",       base: "bg-blue-50 text-blue-700 hover:bg-blue-100",      activeGrad: "linear-gradient(to right, #3b82f6, #2563eb)" },
                  { value: "lost",      label: "Lost",      base: "bg-red-50 text-red-700 hover:bg-red-100",          activeGrad: "linear-gradient(to right, #ef4444, #dc2626)" },
                  { value: "found",     label: "Found",     base: "bg-green-50 text-green-700 hover:bg-green-100",    activeGrad: "linear-gradient(to right, #22c55e, #16a34a)" },
                  { value: "claim",     label: "Claims",    base: "bg-purple-50 text-purple-700 hover:bg-purple-100", activeGrad: "linear-gradient(to right, #a855f7, #9333ea)" },
                  { value: "return",    label: "Returns",   base: "bg-orange-50 text-orange-700 hover:bg-orange-100", activeGrad: "linear-gradient(to right, #f97316, #ea580c)" },
                  { value: "completed", label: "Completed", base: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100", activeGrad: "linear-gradient(to right, #6366f1, #4f46e5)" },
                  { value: "archived",  label: "Archived",  base: "bg-slate-100 text-slate-700 hover:bg-slate-200",   activeGrad: "linear-gradient(to right, #475569, #334155)" },
                ].map((f) => {
                  const isActive = historyFilter === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setHistoryFilter(f.value)}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? "text-white shadow-md" : f.base}`}
                      style={isActive ? { backgroundImage: f.activeGrad } : {}}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <div className="size-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                <div className="bg-blue-100 rounded-full size-16 mx-auto mb-4 flex items-center justify-center">
                  <ClipboardList className="size-8 text-blue-600" />
                </div>
                <p className="text-gray-700 font-bold text-base">No records found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {historyFilter === "all"
                    ? "Your report activity will appear here."
                    : `No ${historyFilter} records yet.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item, idx) => {
                  const typeCfg = TYPE_CONFIG[item.report_type] || {};
                  return (
                    <div
                      key={`${item.report_type}-${item.history_id}-${idx}`}
                      onClick={() => setSelectedHistoryItem(item)}
                      className="flex gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {/* Image or icon */}
                      <div className="shrink-0 size-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          (() => {
                            const Icon = typeCfg.icon || Package;
                            return <Icon className="size-6 text-gray-400" />;
                          })()
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <TypeBadge type={item.report_type} />
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="font-semibold text-gray-900 truncate text-sm">
                          {item.title || <span className="text-gray-400 italic">Untitled</span>}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
                          {item.location_name && (
                            <span className="flex items-center gap-1">
                              📍 {item.location_name}
                            </span>
                          )}
                          {item.reported_at && (
                            <span>
                              🕓 {new Date(item.reported_at).toLocaleDateString("en-US", {
                                timeZone: "UTC", year: "numeric", month: "short", day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions mapped to item state */}
                      <div className="shrink-0 self-center flex items-center gap-2">
                        {item.status !== "archived" && (item.report_type === "lost" || item.report_type === "found") && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => handleArchive(e, item)}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-all font-semibold"
                          >
                            <Archive className="size-4 mr-1.5" />
                            Archive
                          </Button>
                        )}
                        <div className="text-gray-300 group-hover:text-blue-400 transition-colors">
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedHistoryItem && (
        <ItemDetailModal
          isOpen={!!selectedHistoryItem}
          onClose={() => setSelectedHistoryItem(null)}
          report={mapHistoryToReport(selectedHistoryItem)}
          currentUserId={user.id}
          onClaim={() => {}}
        />
      )}
    </div>
  );
}
