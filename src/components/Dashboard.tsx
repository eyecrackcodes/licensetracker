import React, { useEffect, useState, useRef } from "react";
import {
  getDashboardStats,
  getLicenses,
  getProducers,
} from "../services/dataService.js";
import { getLicenseFee } from "../utils/stateLicenseCosts.js";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler,
} from "chart.js";
import { Doughnut, Bar, PolarArea, Line } from "react-chartjs-2";
import {
  FaChartPie,
  FaChartBar,
  FaDollarSign,
  FaMapMarkerAlt,
  FaChartLine,
  FaMoneyBillWave,
  FaLayerGroup,
  FaRegClock,
  FaUser,
} from "react-icons/fa";
import { BsBarChartFill, BsGraphUp } from "react-icons/bs";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  RadialLinearScale,
  Filler
);

interface DashboardStats {
  totalLicenses: number;
  expiringSoon: number;
  expired: number;
  active: number;
  byLocation: Record<string, number>;
}

interface StateBreakdown {
  state: string;
  count: number;
  cost: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalLicenses: 0,
    expiringSoon: 0,
    expired: 0,
    active: 0,
    byLocation: {
      Austin: 0,
      Charlotte: 0,
    },
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLicenseCost, setTotalLicenseCost] = useState<number>(0);
  const [producerCount, setProducerCount] = useState<number>(0);
  const [stateBreakdown, setStateBreakdown] = useState<StateBreakdown[]>([]);
  const [locationBreakdown, setLocationBreakdown] = useState<{
    [key: string]: { active: number; expiring: number; expired: number };
  }>({
    Austin: { active: 0, expiring: 0, expired: 0 },
    Charlotte: { active: 0, expiring: 0, expired: 0 },
    Unknown: { active: 0, expiring: 0, expired: 0 },
  });
  const [licenseTypeData, setLicenseTypeData] = useState<{
    [key: string]: number;
  }>({});
  const [trendData, setTrendData] = useState<{
    labels: string[];
    active: number[];
    expiring: number[];
    expired: number[];
  }>({
    labels: [],
    active: [],
    expiring: [],
    expired: [],
  });

  const polarChartRef = useRef<any>(null);
  const barChartRef = useRef<any>(null);
  const lineChartRef = useRef<any>(null);

  // Add new state for showing all states
  const [showAllStates, setShowAllStates] = useState<boolean>(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log("Fetching dashboard stats...");
        setLoading(true);
        const data = await getDashboardStats();
        console.log("Dashboard stats received:", data);
        setStats(data);

        // Get producer count
        console.log("Fetching producers...");
        const producers = await getProducers();
        console.log(`Found ${producers.length} producers`);
        setProducerCount(producers.length);

        // Calculate total licensing costs and create state breakdown
        console.log("Fetching licenses...");
        const licenses = await getLicenses();
        console.log(`Found ${licenses.length} licenses`);
        let totalCost = 0;

        // Calculate state breakdown
        const stateStats: { [key: string]: { count: number; cost: number } } =
          {};
        const locationStats: {
          [key: string]: { active: number; expiring: number; expired: number };
        } = {
          Austin: { active: 0, expiring: 0, expired: 0 },
          Charlotte: { active: 0, expiring: 0, expired: 0 },
          Unknown: { active: 0, expiring: 0, expired: 0 },
        };

        // Find the producer for each license
        const producersMap = producers.reduce(
          (acc: { [key: string]: any }, producer) => {
            acc[producer.id!] = producer;
            return acc;
          },
          {}
        );

        // Process each license
        console.log("Processing license data...");
        licenses.forEach((license) => {
          // Calculate fee and add to total
          const fee = getLicenseFee(license.state);
          totalCost += fee;

          // Add to state breakdown
          if (!stateStats[license.state]) {
            stateStats[license.state] = { count: 0, cost: 0 };
          }
          stateStats[license.state].count += 1;
          stateStats[license.state].cost += fee;

          // Add to location breakdown
          const producer = producersMap[license.producerId];
          const location = producer?.location || "Unknown";

          if (!locationStats[location]) {
            locationStats[location] = { active: 0, expiring: 0, expired: 0 };
          }

          if (license.status === "expired") {
            locationStats[location].expired += 1;
          } else if (license.status === "expiring") {
            locationStats[location].expiring += 1;
          } else {
            locationStats[location].active += 1;
          }
        });

        // Convert state stats to sorted array
        const stateBreakdownArray = Object.entries(stateStats)
          .map(([state, data]) => ({
            state,
            count: data.count,
            cost: data.cost,
          }))
          .sort((a, b) => b.count - a.count);

        console.log("Setting processed data to state...");
        setStateBreakdown(stateBreakdownArray);
        setLocationBreakdown(locationStats);
        setTotalLicenseCost(totalCost);

        // Calculate license types distribution
        const licenseTypeCounts: { [key: string]: number } = {};
        licenses.forEach((license) => {
          if (!licenseTypeCounts[license.type]) {
            licenseTypeCounts[license.type] = 0;
          }
          licenseTypeCounts[license.type]++;
        });
        setLicenseTypeData(licenseTypeCounts);

        // Generate trend data (simulated for now)
        // In a real app, you'd fetch historical data from the database
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
        const active = months.map((_, i) =>
          Math.round(stats.active * (0.7 + i * 0.05))
        );
        const expiring = months.map((_, i) =>
          Math.round(stats.expiringSoon * (0.8 + i * 0.04))
        );
        const expired = months.map((_, i) =>
          Math.round(stats.expired * (0.9 + i * 0.02))
        );

        setTrendData({
          labels: months,
          active,
          expiring,
          expired,
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError("Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Force re-render of charts once loaded
  useEffect(() => {
    if (!loading) {
      console.log("Dashboard loaded, checking chart renderings...");

      // Force chart redraws
      const updateCharts = () => {
        console.log("Updating charts...");
        if (polarChartRef.current) {
          polarChartRef.current.update();
          console.log("PolarChart updated");
        }
        if (barChartRef.current) {
          barChartRef.current.update();
          console.log("BarChart updated");
        }
        if (lineChartRef.current) {
          lineChartRef.current.update();
          console.log("LineChart updated");
        }
      };

      // Initial update
      updateCharts();

      // Second update after a delay
      const timer = setTimeout(() => {
        updateCharts();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="w-full max-w-full p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-full p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="text-sm">Using placeholder data instead</p>
        </div>
      </div>
    );
  }

  // Calculate percentages for the charts
  const activePercent =
    Math.round((stats.active / stats.totalLicenses) * 100) || 0;
  const expiringPercent =
    Math.round((stats.expiringSoon / stats.totalLicenses) * 100) || 0;
  const expiredPercent =
    Math.round((stats.expired / stats.totalLicenses) * 100) || 0;

  return (
    <div className="w-full max-w-full p-3">
      {/* Header with gradient background */}
      <div className="w-full rounded-xl mb-4 bg-gradient-to-r from-indigo-600 to-blue-500 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4">
          <h2 className="text-2xl font-bold text-white">License Dashboard</h2>

          <div className="mt-2 md:mt-0">
            <div className="flex items-center bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <span className="text-sm font-medium text-white mr-2">
                Last updated:
              </span>
              <span className="text-sm text-white">
                {new Date().toLocaleDateString()}{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Key stats bar */}
        <div className="grid grid-cols-4 gap-0 border-t border-white border-opacity-20 text-white">
          <div className="p-4 text-center border-r border-white border-opacity-20">
            <div className="text-3xl font-bold">{stats.totalLicenses}</div>
            <div className="text-sm opacity-80">Total Licenses</div>
          </div>
          <div className="p-4 text-center border-r border-white border-opacity-20">
            <div className="text-3xl font-bold text-green-300">
              {stats.active}
            </div>
            <div className="text-sm opacity-80">Active</div>
          </div>
          <div className="p-4 text-center border-r border-white border-opacity-20">
            <div className="text-3xl font-bold text-yellow-300">
              {stats.expiringSoon}
            </div>
            <div className="text-sm opacity-80">Expiring Soon</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-red-300">
              {stats.expired}
            </div>
            <div className="text-sm opacity-80">Expired</div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout with Grid - More compact layout with reduced heights */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left Column - Stats & Donut */}
        <div className="xl:col-span-1 space-y-6">
          {/* Stats Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <FaUser className="text-indigo-500 mr-2" />
                License Summary
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {/* Total Licenses */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-indigo-100 rounded-lg p-3 mr-3">
                    <FaLayerGroup className="text-indigo-600 text-lg" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Licenses
                    </p>
                    <p className="text-sm text-gray-500">
                      {producerCount} producers
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  {stats.totalLicenses}
                </div>
              </div>

              {/* Active Licenses */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-green-100 rounded-lg p-3 mr-3">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-sm text-gray-500">
                      {activePercent}% of total
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.active}
                </div>
              </div>

              {/* Expiring Soon */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-yellow-100 rounded-lg p-3 mr-3">
                    <FaRegClock className="text-yellow-600 text-lg" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Expiring Soon
                    </p>
                    <p className="text-sm text-gray-500">Within next 30 days</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.expiringSoon}
                </div>
              </div>

              {/* Expired */}
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-red-100 rounded-lg p-3 mr-3">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expired</p>
                    <p className="text-sm text-gray-500">
                      Need immediate renewal
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.expired}
                </div>
              </div>
            </div>
          </div>

          {/* Status Distribution Visualization */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <FaChartPie className="text-indigo-500 mr-2" />
                Status Distribution
              </h3>
            </div>

            <div className="p-5">
              <div className="flex justify-center">
                <div
                  className="relative"
                  style={{ width: "100%", maxWidth: "220px", height: "220px" }}
                >
                  <Doughnut
                    data={{
                      labels: ["Active", "Expiring Soon", "Expired"],
                      datasets: [
                        {
                          data: [
                            stats.active,
                            stats.expiringSoon,
                            stats.expired,
                          ],
                          backgroundColor: [
                            "rgba(16, 185, 129, 1)", // Green
                            "rgba(245, 158, 11, 1)", // Yellow
                            "rgba(239, 68, 68, 1)", // Red
                          ],
                          hoverBackgroundColor: [
                            "rgba(16, 185, 129, 0.9)",
                            "rgba(245, 158, 11, 0.9)",
                            "rgba(239, 68, 68, 0.9)",
                          ],
                          borderWidth: 2,
                          borderColor: "#ffffff",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      cutout: "70%",
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          enabled: true,
                          backgroundColor: "rgba(0,0,0,0.8)",
                          padding: 12,
                          titleFont: {
                            size: 14,
                            weight: "bold",
                          },
                          bodyFont: {
                            size: 13,
                          },
                          callbacks: {
                            label: function (context) {
                              const label = context.label || "";
                              const value = context.raw as number;
                              const percentage =
                                context.label === "Active"
                                  ? activePercent
                                  : context.label === "Expiring Soon"
                                  ? expiringPercent
                                  : expiredPercent;
                              return `${label}: ${value} (${percentage}%)`;
                            },
                          },
                        },
                      },
                    }}
                  />
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-800">
                        {stats.totalLicenses}
                      </div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-8 h-8 mb-2 rounded-full bg-green-500"></div>
                  <div className="font-semibold text-gray-700 text-center">
                    Active
                  </div>
                  <div className="text-gray-500 text-sm text-center">
                    {activePercent}%
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-8 h-8 mb-2 rounded-full bg-yellow-500"></div>
                  <div className="font-semibold text-gray-700 text-center">
                    Expiring
                  </div>
                  <div className="text-gray-500 text-sm text-center">
                    {expiringPercent}%
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-8 h-8 mb-2 rounded-full bg-red-500"></div>
                  <div className="font-semibold text-gray-700 text-center">
                    Expired
                  </div>
                  <div className="text-gray-500 text-sm text-center">
                    {expiredPercent}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Charts */}
        <div className="xl:col-span-2 space-y-6">
          {/* Trend line chart */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <FaChartLine className="text-blue-500 mr-2" />
                License Status Trends
              </h3>
            </div>

            <div className="p-5">
              <div className="h-64">
                <Line
                  ref={lineChartRef}
                  data={{
                    labels: trendData.labels,
                    datasets: [
                      {
                        label: "Active",
                        data: trendData.active,
                        borderColor: "#10B981",
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        tension: 0.3,
                        fill: true,
                      },
                      {
                        label: "Expiring Soon",
                        data: trendData.expiring,
                        borderColor: "#F59E0B",
                        backgroundColor: "rgba(245, 158, 11, 0.1)",
                        tension: 0.3,
                        fill: true,
                      },
                      {
                        label: "Expired",
                        data: trendData.expired,
                        borderColor: "#EF4444",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        tension: 0.3,
                        fill: true,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "top",
                        labels: {
                          usePointStyle: true,
                          boxWidth: 10,
                          padding: 15,
                        },
                      },
                      tooltip: {
                        mode: "index",
                        intersect: false,
                        backgroundColor: "rgba(0,0,0,0.8)",
                        padding: 12,
                      },
                    },
                    scales: {
                      x: {
                        grid: {
                          display: false,
                        },
                      },
                      y: {
                        grid: {
                          color: "rgba(0, 0, 0, 0.05)",
                        },
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Location breakdown */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <FaMapMarkerAlt className="text-purple-500 mr-2" />
                License Status by Location
              </h3>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 gap-6">
                {Object.entries(locationBreakdown).map(([location, counts]) => {
                  if (counts.active + counts.expiring + counts.expired === 0)
                    return null;

                  const total =
                    counts.active + counts.expiring + counts.expired;
                  const activeWidth = (counts.active / total) * 100;
                  const expiringWidth = (counts.expiring / total) * 100;
                  const expiredWidth = (counts.expired / total) * 100;

                  return (
                    <div key={location} className="mb-1">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-2 text-white text-xs ${
                              location === "Austin"
                                ? "bg-blue-500"
                                : location === "Charlotte"
                                ? "bg-purple-500"
                                : "bg-gray-500"
                            }`}
                          >
                            {location.charAt(0)}
                          </span>
                          <span className="font-medium">{location}</span>
                        </div>
                        <span className="text-gray-500 text-sm">
                          {total} license{total !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="w-full h-8 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-green-500 float-left relative group transition-all hover:opacity-90 cursor-pointer"
                          style={{ width: `${activeWidth}%` }}
                        >
                          {activeWidth > 15 && (
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                              {counts.active}
                            </span>
                          )}
                          <span className="absolute opacity-0 group-hover:opacity-100 bg-black bg-opacity-80 text-white p-1 rounded text-xs -top-8 left-1/2 transform -translate-x-1/2 transition-opacity">
                            {counts.active} Active ({Math.round(activeWidth)}%)
                          </span>
                        </div>
                        <div
                          className="h-full bg-yellow-500 float-left relative group transition-all hover:opacity-90 cursor-pointer"
                          style={{ width: `${expiringWidth}%` }}
                        >
                          {expiringWidth > 15 && (
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                              {counts.expiring}
                            </span>
                          )}
                          <span className="absolute opacity-0 group-hover:opacity-100 bg-black bg-opacity-80 text-white p-1 rounded text-xs -top-8 left-1/2 transform -translate-x-1/2 transition-opacity">
                            {counts.expiring} Expiring (
                            {Math.round(expiringWidth)}
                            %)
                          </span>
                        </div>
                        <div
                          className="h-full bg-red-500 float-left relative group transition-all hover:opacity-90 cursor-pointer"
                          style={{ width: `${expiredWidth}%` }}
                        >
                          {expiredWidth > 15 && (
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                              {counts.expired}
                            </span>
                          )}
                          <span className="absolute opacity-0 group-hover:opacity-100 bg-black bg-opacity-80 text-white p-1 rounded text-xs -top-8 left-1/2 transform -translate-x-1/2 transition-opacity">
                            {counts.expired} Expired ({Math.round(expiredWidth)}
                            %)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* License Type Distribution */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <BsBarChartFill className="text-blue-500 mr-2" />
                License Type Distribution
              </h3>
            </div>

            <div className="p-5">
              {Object.keys(licenseTypeData).length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  No license type data available
                </div>
              ) : (
                <div className="h-56">
                  <PolarArea
                    ref={polarChartRef}
                    data={{
                      labels: Object.keys(licenseTypeData),
                      datasets: [
                        {
                          data: Object.values(licenseTypeData),
                          backgroundColor: [
                            "rgba(59, 130, 246, 0.8)",
                            "rgba(16, 185, 129, 0.8)",
                            "rgba(245, 158, 11, 0.8)",
                            "rgba(99, 102, 241, 0.8)",
                            "rgba(239, 68, 68, 0.8)",
                            "rgba(37, 99, 235, 0.8)",
                            "rgba(124, 58, 237, 0.8)",
                          ],
                          borderWidth: 1,
                          borderColor: "#ffffff",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "right",
                          labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: {
                              size: 12,
                            },
                          },
                        },
                        tooltip: {
                          backgroundColor: "rgba(0,0,0,0.8)",
                          padding: 12,
                        },
                      },
                      scales: {
                        r: {
                          ticks: {
                            display: false,
                          },
                          grid: {
                            color: "rgba(0,0,0,0.05)",
                          },
                        },
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Financial Data */}
        <div className="xl:col-span-1 space-y-4">
          {/* Financial Summary Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <FaMoneyBillWave className="text-green-600 mr-2" />
                Financial Summary
              </h3>
            </div>

            <div className="p-5">
              <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-800">
                      Total Annual Cost
                    </span>
                    <span className="font-semibold text-green-700 text-xl">
                      ${totalLicenseCost.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="w-full h-6 bg-white rounded-full overflow-hidden shadow-inner mb-1">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all relative flex items-center justify-center"
                      style={{ width: "100%" }}
                    >
                      <span className="text-white text-xs font-medium z-10">
                        ${totalLicenseCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-800">
                      Average Cost per License
                    </span>
                    <span className="font-medium text-blue-700 text-xl">
                      $
                      {stats.totalLicenses > 0
                        ? (totalLicenseCost / stats.totalLicenses).toFixed(2)
                        : 0}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="w-full h-2 bg-white rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      style={{
                        width: stats.totalLicenses > 0 ? "100%" : "0%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="text-center mb-3">
                  <p className="text-gray-700 font-medium">
                    Cost Distribution by Status
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-green-600">
                      $
                      {Math.round(
                        (totalLicenseCost * activePercent) / 100
                      ).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Active</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      $
                      {Math.round(
                        (totalLicenseCost * expiringPercent) / 100
                      ).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Expiring</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-600">
                      $
                      {Math.round(
                        (totalLicenseCost * expiredPercent) / 100
                      ).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Expired</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top States Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <FaChartBar className="text-blue-500 mr-2" />
                Top States
              </h3>
            </div>

            <div className="p-5">
              {stateBreakdown.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No state data available
                </div>
              ) : (
                <div>
                  <div className="space-y-2">
                    {/* Show either top 5 states or all states based on showAllStates */}
                    {(showAllStates
                      ? stateBreakdown
                      : stateBreakdown.slice(0, 5)
                    ).map((state, index) => (
                      <div key={state.state} className="flex items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium mr-2 ${
                            index === 0
                              ? "bg-blue-500"
                              : index === 1
                              ? "bg-indigo-500"
                              : index === 2
                              ? "bg-purple-500"
                              : index === 3
                              ? "bg-pink-500"
                              : "bg-gray-500"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-gray-700">
                              {state.state}
                            </span>
                            <span className="text-sm text-gray-500">
                              {state.count} licenses
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`h-full rounded-full ${
                                index === 0
                                  ? "bg-blue-500"
                                  : index === 1
                                  ? "bg-indigo-500"
                                  : index === 2
                                  ? "bg-purple-500"
                                  : index === 3
                                  ? "bg-pink-500"
                                  : "bg-gray-500"
                              }`}
                              style={{
                                width: `${
                                  (state.count / stateBreakdown[0].count) * 100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-2 border-t border-gray-100 text-center">
                    <button
                      className="text-sm text-blue-500 hover:text-blue-700 font-medium"
                      onClick={() => setShowAllStates(!showAllStates)}
                    >
                      {showAllStates ? "Show Top 5 States" : "View All States"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reduced space for footer note */}
      <div className="text-center text-gray-400 text-xs mt-4">
        <p>
          Dashboard data refreshed on {new Date().toLocaleDateString()} at{" "}
          {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
