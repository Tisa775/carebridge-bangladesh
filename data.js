// CareBridge Bangladesh - Initial Datasets & Mock Data

window.CAREBRIDGE_DATA = {
  currentUser: {
    name: "Argho Saha",
    role: "Administrator",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    notificationsCount: 5,
    messagesCount: 3
  },

  stats: {
    totalCases: { count: "12,482", change: "+18.4%", trend: "up", color: "green", sparkline: [12, 14, 18, 15, 20, 22, 26] },
    highPriority: { count: "324", change: "+24.6%", trend: "up", color: "red", sparkline: [8, 10, 15, 12, 18, 22, 28] },
    inProgress: { count: "652", change: "+12.5%", trend: "up", color: "orange", sparkline: [14, 16, 15, 19, 17, 21, 23] },
    resolved: { count: "11,506", change: "+21.3%", trend: "up", color: "blue", sparkline: [20, 24, 22, 28, 26, 32, 35] },
    avgResponseTime: { count: "18 min", change: "-8.2%", trend: "down", color: "green", sparkline: [28, 24, 20, 19, 18, 18, 17] }
  },

  // Map Cluster Pins & Hotspots in Dhaka
  mapHotspots: [
    { id: 'mirpur', name: 'Mirpur-10', lat: 23.8067, lng: 90.3687, count: 24, type: 'red', priority: 'High Priority', desc: 'Critical child assistance and shelter requests' },
    { id: 'dhanmondi', name: 'Dhanmondi', lat: 23.7465, lng: 90.3760, count: 32, type: 'red', priority: 'High Priority', desc: 'Medical emergency & crisis relief ongoing' },
    { id: 'uttara', name: 'Uttara Sector 7', lat: 23.8759, lng: 90.3795, count: 16, type: 'orange', priority: 'Medium Priority', desc: 'Displaced families awaiting volunteer dispatch' },
    { id: 'mohammadpur', name: 'Mohammadpur', lat: 23.7658, lng: 90.3584, count: 11, type: 'orange', priority: 'Medium Priority', desc: 'Disability support & food ration needs' },
    { id: 'gulshan', name: 'Gulshan 2', lat: 23.7925, lng: 90.4078, count: 8, type: 'green', priority: 'Resolved', desc: '8 cases successfully processed by BRAC' },
    { id: 'demra', name: 'Demra', lat: 23.7147, lng: 90.4988, count: 6, type: 'green', priority: 'Resolved', desc: 'Flood relief shelter transition completed' },
    { id: 'motijheel', name: 'Motijheel C/A', lat: 23.7330, lng: 90.4172, count: 14, type: 'orange', priority: 'Medium Priority', desc: 'Homeless shelter intake queue' },
    { id: 'badda', name: 'Middle Badda', lat: 23.7806, lng: 90.4267, count: 19, type: 'red', priority: 'High Priority', desc: 'Urgent medical rescue required' }
  ],

  // Specific single point markers
  singlePins: [
    { id: 'p1', name: 'Kathalbagan Center', lat: 23.7510, lng: 90.3900, type: 'blue', priority: 'Low Priority' },
    { id: 'p2', name: 'Keraniganj South', lat: 23.6850, lng: 90.3800, type: 'blue', priority: 'Low Priority' },
    { id: 'p3', name: 'Asha Shelter Mirpur', lat: 23.8150, lng: 90.3600, type: 'purple', priority: 'Shelters' },
    { id: 'p4', name: 'BRAC Aid Hub Uttara', lat: 23.8650, lng: 90.3950, type: 'purple', priority: 'Shelters' }
  ],

  // Case Queue
  caseQueue: [
    {
      id: "CB-12482",
      title: "Child requiring assistance",
      location: "Mirpur-10, Dhaka",
      distance: "1.8 km away",
      time: "4 min ago",
      priority: "high",
      priorityLabel: "HIGH PRIORITY",
      aiConfidence: 92,
      category: "Child",
      photo: "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80",
      description: "Unaccompanied minor found near Mirpur-10 roundabout looking for parents. Immediate protective shelter needed.",
      reporter: "Tariqul Islam (Local Volunteer)",
      contact: "+880 1712-345678",
      assignedNGO: "Asha Foundation"
    },
    {
      id: "CB-12481",
      title: "Elderly needs shelter",
      location: "Kathalbagan, Dhaka",
      distance: "3.2 km away",
      time: "8 min ago",
      priority: "medium",
      priorityLabel: "MEDIUM PRIORITY",
      aiConfidence: 87,
      category: "Elderly",
      photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
      description: "Elderly man suffering from mild dehydration without shelter near Green Road intersection. Requires food & medical checkup.",
      reporter: "Dr. Farzana Rahman",
      contact: "+880 1819-987654",
      assignedNGO: "BRAC Humanitarian"
    },
    {
      id: "CB-12480",
      title: "Person with disability",
      location: "Mohammadpur, Dhaka",
      distance: "4.5 km away",
      time: "15 min ago",
      priority: "low",
      priorityLabel: "LOW PRIORITY",
      aiConfidence: 76,
      category: "Disability",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      description: "Wheelchair breakdown and mobility support needed on Ring Road. Requires assistance getting to safe clinic.",
      reporter: "Kamal Hossain",
      contact: "+880 1911-223344",
      assignedNGO: "Proshika Aid"
    }
  ],

  // Live Activity Feed items
  liveActivity: [
    { id: 1, type: "report", icon: "plus", color: "red", title: "New case reported", subtitle: "Mirpur-10, Dhaka", time: "2m ago" },
    { id: 2, type: "ngo", icon: "check", color: "green", title: "NGO accepted the case", subtitle: "Asha Foundation", time: "4m ago" },
    { id: 3, type: "volunteer", icon: "user", color: "blue", title: "Volunteer assigned", subtitle: "Mr. Rahim Khan", time: "6m ago" },
    { id: 4, type: "rescue", icon: "crosshair", color: "orange", title: "Rescue in progress", subtitle: "Dhanmondi, Dhaka", time: "12m ago" },
    { id: 5, type: "resolved", icon: "check", color: "green", title: "Case resolved", subtitle: "Mohammadpur, Dhaka", time: "25m ago" }
  ],

  // Trusted Organizations
  trustedOrganizations: [
    { name: "Asha Foundation", cases: "342 cases handled", rating: 4.8, logoColor: "#059669", initials: "AF" },
    { name: "BRAC", cases: "298 cases handled", rating: 4.7, logoColor: "#ec4899", initials: "BR" },
    { name: "Proshika", cases: "186 cases handled", rating: 4.6, logoColor: "#8b5cf6", initials: "PR" },
    { name: "Friendship", cases: "164 cases handled", rating: 4.5, logoColor: "#3b82f6", initials: "FR" }
  ],

  // Recent Cases Full Table
  recentCases: [
    { id: "CB-12482", category: "Child", icon: "fa-child", location: "Mirpur-10, Dhaka", priority: "High", priorityClass: "urgency-high", reported: "4 min ago", status: "In Progress", statusClass: "status-in-progress", confidence: "92%" },
    { id: "CB-12481", category: "Elderly", icon: "fa-person-cane", location: "Kathalbagan, Dhaka", priority: "Medium", priorityClass: "urgency-med", reported: "8 min ago", status: "Assigned", statusClass: "status-assigned", confidence: "87%" },
    { id: "CB-12480", category: "Disability", icon: "fa-wheelchair", location: "Mohammadpur, Dhaka", priority: "Low", priorityClass: "urgency-low", reported: "15 min ago", status: "In Progress", statusClass: "status-in-progress", confidence: "76%" },
    { id: "CB-12479", category: "Homeless", icon: "fa-house-chimney-crack", location: "Motijheel, Dhaka", priority: "Medium", priorityClass: "urgency-med", reported: "18 min ago", status: "Pending", statusClass: "status-pending", confidence: "81%" },
    { id: "CB-12478", category: "Child", icon: "fa-child", location: "Uttara, Dhaka", priority: "High", priorityClass: "urgency-high", reported: "22 min ago", status: "Assigned", statusClass: "status-assigned", confidence: "90%" },
    { id: "CB-12477", category: "Elderly", icon: "fa-person-cane", location: "Badda, Dhaka", priority: "High", priorityClass: "urgency-high", reported: "35 min ago", status: "In Progress", statusClass: "status-in-progress", confidence: "94%" },
    { id: "CB-12476", category: "Medical", icon: "fa-heart-pulse", location: "Old Dhaka, Lalbagh", priority: "High", priorityClass: "urgency-high", reported: "42 min ago", status: "Resolved", statusClass: "status-resolved", confidence: "96%" }
  ],

  // Notifications List for Dropdown
  notifications: [
    { title: "🚨 Emergency SOS in Dhanmondi", desc: "Flood evacuation request for 12 elderly residents.", time: "1 min ago", unread: true },
    { title: "🏥 Volunteer Dispatch", desc: "Rahim Khan accepted case CB-12482 at Mirpur-10.", time: "5 min ago", unread: true },
    { title: "🤝 New NGO Partner Registered", desc: "Dhaka Relief Squad submitted registration documents.", time: "15 min ago", unread: true },
    { title: "📊 Weekly Report Ready", desc: "AI generated week 35 crisis response summary.", time: "1 hour ago", unread: false },
    { title: "✅ 5 Cases Resolved Today", desc: "Asha Foundation updated 5 shelter cases.", time: "2 hours ago", unread: false }
  ]
};
