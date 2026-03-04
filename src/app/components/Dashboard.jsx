import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select.jsx";
import { ItemCard } from "@/app/components/ItemCard.jsx";
import { ReportForm } from "@/app/components/ReportForm.jsx";
import { AuthForm } from "@/app/components/AuthForm.jsx";
import { NotificationPanel } from "@/app/components/NotificationPanel.jsx";
import { ProfilePage } from "@/app/components/ProfilePage.jsx";
import { FunStats } from "@/app/components/FunStats.jsx";
import { PlusCircle, Search, LogOut, Package, RotateCcw, Activity } from "lucide-react";
import { toast } from "sonner";



export function Dashboard({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [reports, setReports] = useState([]);
  const [showReportForm, setShowReportForm] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  const getInitials = (name) =>
    (name || "?")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const handleUpdateUser = (updates) => setUser((u) => ({ ...u, ...updates }));

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterLocation("all");
    setSortOrder("newest");
    toast.info("Filters cleared");
  };

  useEffect(() => {
    fetchReports();
  }, [searchQuery, filterCategory, filterLocation, sortOrder, activeTab]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        search: searchQuery,
        category: filterCategory,
        location: filterLocation,
        sort: sortOrder,
        type: activeTab,
        userId: user.id
      });

      const response = await fetch(`http://localhost:3000/api/dashboard?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (report) => {
    setShowReportForm(null);
    toast.success("Report submitted! Refreshing feed...");
    // Optimistically close form immediately, fetch in background
    fetchReports();
  };

  const handleArchiveItem = (itemId) => {
    // Remove the archived item from the current view
    setReports(prevReports => 
      prevReports.filter(report => report.id !== itemId)
    );
  };


  // Filter and sort reports are now handled by the database function
  const filteredReports = reports;

  const categories = [
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

  const locations = [
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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto py-8">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-blue-200 shadow-xl sticky top-0 z-10 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg hover:scale-105 transition-transform">
                <Package className="size-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                  Campus Lost & Found
                </h1>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  Welcome back, <span className="font-bold text-blue-600">{user.name}</span> 👋
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationPanel userId={user.id} />
              {/* Profile Avatar Button */}
              <button
                onClick={() => setShowProfile(true)}
                title="My Profile"
                className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all border-2 border-blue-300 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
              >
                {getInitials(user.name)}
              </button>
              <Button
                variant="outline"
                onClick={() => setShowStats(true)}
                title="Fun Stats"
                className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-400 transition-all shadow-md hover:shadow-lg border-2 font-semibold"
              >
                <Activity className="size-4 mr-2" />
                Stats
              </Button>
              <Button 
                variant="outline" 

                onClick={onLogout} 
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-all shadow-md hover:shadow-lg border-2 font-semibold"
              >
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button 
            onClick={() => setShowReportForm("lost")} 
            className="flex-1 sm:flex-none bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 shadow-lg hover:shadow-2xl transition-all duration-300 text-white font-bold py-6 px-6 text-base group"
          >
            <PlusCircle className="size-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Report Lost Item
          </Button>
          <Button 
            onClick={() => setShowReportForm("found")} 
            className="flex-1 sm:flex-none bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:from-green-600 hover:via-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-2xl transition-all duration-300 font-bold py-6 px-6 text-base group"
          >
            <PlusCircle className="size-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Report Found Item
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border-2 border-gray-100 hover:border-blue-200 transition-all">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by item name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 h-12 text-base rounded-xl"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="h-12 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 font-semibold px-6 rounded-xl transition-all"
              >
                <RotateCcw className="size-4 mr-2" />
                Clear All
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full border-2 border-gray-200 py-5.5 h-12 text-base rounded-xl font-medium">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-full border-2 border-gray-200 py-5.5 h-12 text-base rounded-xl font-medium">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full border-2 border-gray-200 py-5.5 h-12 text-base rounded-xl font-medium">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white px-2 py-5.5 rounded-xl shadow-lg border-2 border-gray-200">
            <TabsTrigger 
              value="all" 
              className="mr-1 bg-blue-50 text-blue-700 hover:bg-blue-100 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white font-semibold px-6 py-4 rounded-lg transition-all"
            >
              All Items
            </TabsTrigger>
            <TabsTrigger 
              value="lost" 
              className="mr-1 bg-red-50 text-red-700 hover:bg-red-100 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white font-semibold px-6 py-4 rounded-lg transition-all"
            >
              Lost
            </TabsTrigger>
            <TabsTrigger 
              value="found" 
              className="mr-1 bg-green-50 text-green-700 hover:bg-green-100 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white font-semibold px-6 py-4 rounded-lg transition-all"
            >
              Found
            </TabsTrigger>
            <TabsTrigger 
              value="my-reports" 
              className="mr-1 bg-pink-50 text-pink-700 hover:bg-pink-100 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-400 data-[state=active]:to-pink-500 data-[state=active]:text-white font-semibold px-6 py-4 rounded-lg transition-all"
            >
              My Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="text-center py-24 bg-white rounded-2xl shadow-xl border-2 border-blue-100">
                <div className="size-20 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-gray-800 font-bold text-lg">Loading reports...</p>
                <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the latest items</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-2xl shadow-xl border-2 border-dashed border-gray-300">
                <div className="bg-blue-100 rounded-full size-24 mx-auto mb-6 flex items-center justify-center">
                  <Package className="size-12 text-blue-600" />
                </div>
                <p className="text-xl font-bold text-gray-800 mb-2">No items found</p>
                <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReports.map((report, index) => (
                  <div 
                    key={report.id ?? index} 
                    className="animate-in fade-in slide-in-from-bottom-6" 
                    style={{ 
                      animationDelay: `${index * 60}ms`, 
                      animationDuration: '500ms', 
                      animationFillMode: 'backwards' 
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
      </div>
    </div>
  );
}
