import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select.jsx";
import { ItemCard } from "@/app/components/ItemCard.jsx";
import { ReportForm } from "@/app/components/ReportForm.jsx";
import { NotificationPanel } from "@/app/components/NotificationPanel.jsx";
import { ProfilePage } from "@/app/components/ProfilePage.jsx";
import { FunStats } from "@/app/components/FunStats.jsx";
import {
  Activity,
  FilterX,
  LogOut,
  Package,
  PlusCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const DASHBOARD_PREFS_KEY_PREFIX = "campus-lnf:dashboard";

const CATEGORIES = [
  "Electronics",
  "Clothing & Accessories",
  "Books & Stationery",
  "Bags & Backpacks",
  "Keys",
  "Wallets & Purses",
  "Cash",
  "ID Cards & Documents",
  "Other",
];

const LOCATIONS = [
  "CDS",
  "AB1",
  "AB2",
  "AB3",
  "Football Field",
  "Auditorium",
  "Male Hall",
  "Female Hall",
  "Library/Study",
  "Car Parking",
  "Other",
];

const getPrefsKey = (userId) => `${DASHBOARD_PREFS_KEY_PREFIX}:${userId}`;

const readDashboardPrefs = (userId) => {
  if (typeof window === "undefined" || !userId) return {};

  try {
    const saved = window.localStorage.getItem(getPrefsKey(userId));
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error("Failed to read dashboard preferences:", error);
    return {};
  }
};

const persistDashboardPrefs = (userId, prefs) => {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.localStorage.setItem(getPrefsKey(userId), JSON.stringify(prefs));
  } catch (error) {
    console.error("Failed to persist dashboard preferences:", error);
  }
};

export function Dashboard({ user: initialUser, onLogout, onSessionUpdate }) {
  const [user, setUser] = useState(initialUser);
  const [reports, setReports] = useState([]);
  const [showReportForm, setShowReportForm] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [initialPrefs] = useState(() => readDashboardPrefs(initialUser?.id));
  const [searchQuery, setSearchQuery] = useState(() => initialPrefs.searchQuery ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => initialPrefs.searchQuery ?? "");
  const [filterCategory, setFilterCategory] = useState(() => initialPrefs.filterCategory ?? "all");
  const [filterLocation, setFilterLocation] = useState(() => initialPrefs.filterLocation ?? "all");
  const [sortOrder, setSortOrder] = useState(() => initialPrefs.sortOrder ?? "newest");
  const [activeTab, setActiveTab] = useState(() => initialPrefs.activeTab ?? "all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 240);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    persistDashboardPrefs(user.id, {
      searchQuery,
      filterCategory,
      filterLocation,
      sortOrder,
      activeTab,
    });
  }, [user.id, searchQuery, filterCategory, filterLocation, sortOrder, activeTab]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        search: debouncedSearch,
        category: filterCategory,
        location: filterLocation,
        sort: sortOrder,
        type: activeTab,
        userId: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/dashboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      setReports(await response.json());
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, filterCategory, filterLocation, sortOrder, user.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateUser = (updates) => {
    setUser((previousUser) => {
      const nextUser = { ...previousUser, ...updates };
      onSessionUpdate?.(nextUser);
      return nextUser;
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterLocation("all");
    setSortOrder("newest");
    setActiveTab("all");
    toast.info("Filters cleared");
  };

  const handleSubmitReport = async () => {
    setShowReportForm(null);
    toast.success("Report submitted. Refreshing feed...");
    fetchReports();
  };

  const handleArchiveItem = (itemId) => {
    setReports((previousReports) => previousReports.filter((report) => report.id !== itemId));
  };

  const getInitials = (name) =>
    (name || "?")
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const summary = useMemo(() => {
    const lostCount = reports.filter((report) => report.type === "lost").length;
    const foundCount = reports.filter((report) => report.type === "found").length;
    const ownCount = reports.filter((report) => report.userId === user.id).length;

    return {
      total: reports.length,
      lostCount,
      foundCount,
      ownCount,
    };
  }, [reports, user.id]);

  if (showProfile) {
    return (
      <ProfilePage
        user={user}
        onBack={() => setShowProfile(false)}
        onUpdateUser={handleUpdateUser}
      />
    );
  }

  if (showStats) {
    return <FunStats onBack={() => setShowStats(false)} />;
  }

  if (showReportForm) {
    return (
      <div className="min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <ReportForm
            type={showReportForm}
            userId={user.id}
            onSubmit={handleSubmitReport}
            onCancel={() => setShowReportForm(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Package className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Campus Lost & Found</h1>
              <p className="text-sm text-slate-600">
                Welcome back,{" "}
                <span className="font-semibold text-slate-900">
                  {user.name || user.email}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationPanel userId={user.id} />

            <button
              type="button"
              onClick={() => setShowProfile(true)}
              title="My Profile"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              {getInitials(user.name)}
            </button>

            <Button
              variant="outline"
              onClick={() => setShowStats(true)}
              title="Fun Stats"
              className="hidden sm:inline-flex"
            >
              <Activity className="size-4" />
              Stats
            </Button>

            <Button
              variant="outline"
              onClick={onLogout}
              className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-7 sm:py-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-red-300 hover:shadow-md"
            onClick={() => setShowReportForm("lost")}
          >
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <PlusCircle className="size-5" />
            </div>
            <p className="text-sm font-semibold text-red-700">Report Lost Item</p>
            <p className="mt-1 text-xs text-slate-500">Create a new lost-item post.</p>
          </button>

          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            onClick={() => setShowReportForm("found")}
          >
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <PlusCircle className="size-5" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">Report Found Item</p>
            <p className="mt-1 text-xs text-slate-500">Help return someone's belongings.</p>
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible Now</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.total}</p>
            <p className="text-xs text-slate-500">Filtered posts in your current view</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Posts</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.ownCount}</p>
            <p className="text-xs text-slate-500">
              {summary.lostCount} lost, {summary.foundCount} found in this result set
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by item title or description..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={handleClearFilters}>
                <FilterX className="size-4" />
                Reset
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {LOCATIONS.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
            <TabsTrigger value="all" className="min-w-24">
              All
            </TabsTrigger>
            <TabsTrigger value="lost" className="min-w-24">
              Lost
            </TabsTrigger>
            <TabsTrigger value="found" className="min-w-24">
              Found
            </TabsTrigger>
            <TabsTrigger value="my-reports" className="min-w-30">
              My Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
                <div className="mx-auto mb-5 size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="font-semibold text-slate-800">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center shadow-sm">
                <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Package className="size-7" />
                </div>
                <p className="font-semibold text-slate-800">No items found</p>
                <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {reports.map((report, index) => (
                  <div
                    key={report.id ?? index}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{
                      animationDelay: `${index * 45}ms`,
                      animationDuration: "360ms",
                      animationFillMode: "backwards",
                    }}
                  >
                    <ItemCard
                      report={report}
                      currentUserId={user.id}
                      onArchive={handleArchiveItem}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
