import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, ShoppingBag, Clock, Award, AlertCircle, Lock, Mail } from "lucide-react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { db } from "../../../../firebaseConfig";

// Colors for charts
const COLORS = ["#00C49F", "#FFBB28", "#0088FE", "#FF8042", "#8884d8"]; // Adjusted order for status

// Define the conversion rate: 1kg of food feeds 3 people
const FOOD_TO_PEOPLE_RATIO = 3;

// Static authorized users
const AUTHORIZED_USERS = [
  { email: "dhoranyogesh500@gmail.com", password: "Yogesh@8848" },
  { email: "atharvnangare2065@gmail.com ", password: "Atharv@123" },
  { email: "zoreraj099@gmail.com", password: "Raj@123" },
  {email:"sanjyotkhandave41@gmail.com",password:"Sanjyot@123"},
  {email:"devsurve1625@gmail.com",password:"Devvrat@123"}
];

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState({
    donations: [],
    donors: [],
    volunteers: [],
  });
  const [donationStatusFilter, setDonationStatusFilter] = useState("all");

  // Check if user credentials are saved in localStorage
  useEffect(() => {
    const savedAuth = localStorage.getItem("dashboardAuth");
    if (savedAuth) {
      try {
        const { email, isAuth } = JSON.parse(savedAuth);
        // Verify if the email exists in authorized users
        const userExists = AUTHORIZED_USERS.some(user => user.email === email);
        if (isAuth && userExists) {
          setIsAuthenticated(true);
          setEmail(email);
        }
      } catch (e) {
        localStorage.removeItem("dashboardAuth");
      }
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setAuthError("");

    const user = AUTHORIZED_USERS.find(
      user => user.email === email && user.password === password
    );

    if (user) {
      setIsAuthenticated(true);
      localStorage.setItem("dashboardAuth", JSON.stringify({ email, isAuth: true }));
    } else {
      setAuthError("Invalid email or password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmail("");
    setPassword("");
    localStorage.removeItem("dashboardAuth");
  };

  const stats = useMemo(() => {
    if (
      !rawData.donations.length &&
      !rawData.donors.length &&
      !rawData.volunteers.length
    ) {
      return {
        totalDonations: 0,
        pendingDonations: 0,
        acceptedDonations: 0,
        totalFoodWeight: 0,
        totalDonors: 0,
        totalVolunteers: 0,
        peopleFed: 0,
        statusData: [],
        foodTypeData: [],
        donorTypeData: [],
        topVolunteers: [],
      };
    }

    const { donations, donors, volunteers } = rawData;

    const pendingDonations = donations.filter(
      (d) => d.status === "pending"
    ).length;
    const acceptedDonations = donations.filter(
      (d) => d.status === "accepted"
    ).length;
    const totalFoodWeight = donations.reduce(
      (sum, d) => sum + (Number(d.foodWeight) || 0),
      0
    );
    
    // Calculate people fed based on the food weight and the ratio (1kg feeds 3 people)
    const peopleFed = Math.floor(totalFoodWeight * FOOD_TO_PEOPLE_RATIO);

    const statusData = [
      { name: "Accepted", value: acceptedDonations, fill: COLORS[0] },
      { name: "Pending", value: pendingDonations, fill: COLORS[1] },
    ];

    const foodTypeWeights = {};
    donations.forEach((donation) => {
      const type = donation.foodItems || "Unknown";
      const weight = Number(donation.foodWeight) || 0;
      if (foodTypeWeights[type]) {
        foodTypeWeights[type] += weight;
      } else {
        foodTypeWeights[type] = weight;
      }
    });
    const foodTypeData = Object.entries(foodTypeWeights).map(
      ([name, value]) => ({ name, value: parseFloat(value.toFixed(1)) })
    );

    const donorTypeCounts = {};
    donors.forEach((donor) => {
      const type = donor.donorType || "Unknown";
      if (donorTypeCounts[type]) {
        donorTypeCounts[type]++;
      } else {
        donorTypeCounts[type] = 1;
      }
    });
    const donorTypeData = Object.entries(donorTypeCounts).map(
      ([name, value]) => ({ name, value })
    );

    const topVolunteers = [...volunteers]
      .sort(
        (a, b) =>
          (Number(b.acceptedCount) || 0) - (Number(a.acceptedCount) || 0)
      )
      .slice(0, 3);

    return {
      totalDonations: donations.length,
      pendingDonations,
      acceptedDonations,
      totalFoodWeight,
      totalDonors: donors.length,
      totalVolunteers: volunteers.length,
      peopleFed,
      statusData,
      foodTypeData,
      donorTypeData,
      topVolunteers,
    };
  }, [rawData]);

  const donorMap = useMemo(() => {
    const map = new Map();
    rawData.donors.forEach((donor) => map.set(donor.id, donor));
    return map;
  }, [rawData.donors]);

  const filteredDonations = useMemo(() => {
    if (donationStatusFilter === "all") {
      return rawData.donations;
    }
    return rawData.donations.filter((d) => d.status === donationStatusFilter);
  }, [rawData.donations, donationStatusFilter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const donationsSnapshot = await getDocs(collection(db, "donations"));
        const donationsData = donationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const donorsSnapshot = await getDocs(collection(db, "donors"));
        const donorsData = donorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const volunteersSnapshot = await getDocs(collection(db, "volunteers"));
        const volunteersData = volunteersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRawData({
          donations: donationsData,
          donors: donorsData,
          volunteers: volunteersData,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(
          `Failed to fetch data: ${error.message}. Please try again later.`
        );
        setLoading(false);
      }
    }

    fetchData();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 rounded-full p-3">
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Admin Dashboard Login</h2>
          
          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
              <span className="block sm:inline">{authError}</span>
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="admin@foodbank.org"
                  required
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                type="submit"
              >
                Sign In
              </button>
            </div>
          </form>
          
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-lg">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">
          Error Loading Dashboard
        </h2>
        <p className="text-gray-700">{error}</p>
        <p className="text-sm text-gray-500 mt-2">
          Please check your Firebase configuration and network connection.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Organization Dashboard</h1>
            <p className="text-sm mt-1 opacity-90">
              Overview of donations, donors, and volunteers
            </p>
          </div>
          <div className="flex items-center">
            <span className="mr-3 text-sm">{email}</span>
            <button 
              onClick={handleLogout}
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-1 rounded-md text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-sm sticky top-[76px] z-10">
        <div className="container mx-auto flex border-b border-gray-200">
          {["overview", "donations", "people"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-3 font-medium text-sm capitalize ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-blue-600"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="container mx-auto p-4 md:p-6">
        {activeTab === "overview" && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-4 flex items-center">
                <div className="rounded-full bg-blue-100 p-3 mr-4 shrink-0">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Donations</p>
                  <h3 className="text-2xl font-bold">{stats.totalDonations}</h3>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 flex items-center">
                <div className="rounded-full bg-green-100 p-3 mr-4 shrink-0">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">People Fed</p>
                  <p className="text-xs text-gray-400">1kg feeds 3 people</p>
                  <h3 className="text-2xl font-bold">
                    {stats.peopleFed > 0
                      ? stats.peopleFed.toLocaleString()
                      : "N/A"}
                  </h3>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 flex items-center">
                <div className="rounded-full bg-yellow-100 p-3 mr-4 shrink-0">
                  <ShoppingBag className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">
                    Total Food Weight (kg)
                  </p>
                  <h3 className="text-2xl font-bold">
                    {stats.totalFoodWeight.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </h3>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 flex items-center">
                <div className="rounded-full bg-purple-100 p-3 mr-4 shrink-0">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Pending Donations</p>
                  <h3 className="text-2xl font-bold">
                    {stats.pendingDonations}
                  </h3>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">Donation Status</h3>
                <div className="h-64 md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent, value }) =>
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {stats.statusData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Food Donated by Type (Weight in kg)
                </h3>
                <div className="h-64 md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.foodTypeData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => `${value.toLocaleString()} kg`}
                      />
                      <Legend />
                      <Bar
                        dataKey="value"
                        name="Weight (kg)"
                        fill={COLORS[2]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow p-4 mb-6">
              <h3 className="text-lg font-semibold mb-4">Top Volunteers</h3>
              {stats.topVolunteers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.topVolunteers.map((volunteer, index) => (
                    <div
                      key={volunteer.id}
                      className="border border-gray-200 rounded-lg p-3 flex items-center hover:shadow-md transition-shadow"
                    >
                      <div
                        className={`rounded-full text-white font-bold h-10 w-10 flex items-center justify-center mr-3 shrink-0 ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                            ? "bg-gray-400"
                            : "bg-orange-400"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">
                          {volunteer.name || "Unnamed Volunteer"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {volunteer.acceptedCount || 0} accepted donations
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  No volunteer data available.
                </p>
              )}
            </section>
          </>
        )}

        {activeTab === "donations" && (
          <>
            <h2 className="text-xl font-semibold mb-4">Donation Management</h2>

            <div className="flex mb-4 space-x-2">
              {["all", "pending", "accepted"].map((status) => (
                <button
                  key={status}
                  onClick={() => setDonationStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    donationStatusFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Food Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight (kg)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      People Fed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDonations.length > 0 ? (
                    filteredDonations.map((donation) => {
                      const donor = donation.userId
                        ? donorMap.get(donation.userId)
                        : null;
                      const weight = Number(donation.foodWeight) || 0;
                      const peopleFedByDonation = Math.floor(weight * FOOD_TO_PEOPLE_RATIO);
                      
                      return (
                        <tr
                          key={donation.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {donation.foodItems || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {weight.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {peopleFedByDonation.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                donation.status === "accepted"
                                  ? "bg-green-100 text-green-800"
                                  : donation.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {donation.status
                                ? donation.status.charAt(0).toUpperCase() +
                                  donation.status.slice(1)
                                : "Unknown"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {donor
                                ? donor.name
                                : donation.userId
                                ? "Unknown Donor"
                                : "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {donor ? donor.donorType : ""}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              className="text-blue-600 hover:text-blue-900 mr-3 disabled:opacity-50"
                              disabled
                            >
                              View
                            </button>
                            {donation.status === "pending" && (
                              <button
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                disabled
                              >
                                Assign
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center py-4 text-gray-500 italic"
                      >
                        No donations found matching the criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "people" && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Donors ({stats.totalDonors})
                </h3>
              </div>
              {rawData.donors.length > 0 ? (
                <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {rawData.donors.map((donor) => (
                    <li
                      key={donor.id}
                      className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {donor.name
                                ? donor.name.charAt(0).toUpperCase()
                                : "?"}
                            </span>
                          </div>
                          <div className="ml-4 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {donor.name || "Unnamed Donor"}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {donor.donorType || "Unknown Type"}
                            </div>
                          </div>
                        </div>
                        <div className="ml-2 shrink-0">
                          {donor.badge && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                              <Award className="w-3 h-3 mr-1" />
                              {donor.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center py-4 text-gray-500 italic">
                  No donors found.
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Volunteers ({stats.totalVolunteers})
                </h3>
              </div>
              {rawData.volunteers.length > 0 ? (
                <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {rawData.volunteers.map((volunteer) => (
                    <li
                      key={volunteer.id}
                      className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0">
                          <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-medium">
                              {volunteer.name
                                ? volunteer.name.charAt(0).toUpperCase()
                                : "?"}
                            </span>
                          </div>

                          <div className="ml-4 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {volunteer.name || "Unnamed Volunteer"}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {Number(volunteer.acceptedCount) || 0} donations
                              accepted
                            </div>
                          </div>
                        </div>
                        <button
                          className="ml-2 px-3 py-1 border border-gray-300 text-xs rounded-md text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap disabled:opacity-50"
                          disabled
                        >
                          Contact
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center py-4 text-gray-500 italic">
                  No volunteers found.
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">
                Donor Types Distribution
              </h3>
              <div className="h-64 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.donorTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius="80%"
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent, value }) =>
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {stats.donorTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-donor-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;