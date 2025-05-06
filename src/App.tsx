import React, { useState, useEffect, useRef } from "react";
// Temporarily remove MUI imports
// import { AppBar, Toolbar, Typography, Container, Box, Button, CssBaseline } from "@mui/material";

// Import dashboard component but leave out the other components for now
import Dashboard from "./components/Dashboard.tsx";
import DataImport from "./components/DataImport";
import ProducerPage from "./ProducerPage"; // Import our new ProducerPage component

import {
  Producer,
  License,
  getProducers,
  getLicenses,
  addProducer,
  updateProducer,
  deleteProducer,
  addLicense,
  updateLicense,
  deleteLicense,
} from "./services/dataService.js";

import {
  stateLicenseCosts,
  licenseTypes,
  getLicenseFee,
} from "./utils/stateLicenseCosts.js";

import { database } from "./firebase.js";
import { ref, update } from "firebase/database";

// Add these imports at the top of the file to use icons
import {
  FaEdit,
  FaTrashAlt,
  FaToggleOn,
  FaToggleOff,
  FaUsers,
  FaIdCard,
  FaFileAlt,
} from "react-icons/fa";
import { IoLocationSharp } from "react-icons/io5";

// Update the Producers component to show license counts per producer
// Add this function to get license counts for each producer
const getLicenseCountsForProducer = (producerId, licenses) => {
  const producerLicenses = licenses.filter(
    (license) => license.producerId === producerId
  );
  const total = producerLicenses.length;
  const active = producerLicenses.filter(
    (license) => license.status === "active"
  ).length;
  const expiring = producerLicenses.filter(
    (license) => license.status === "expiring"
  ).length;
  const expired = producerLicenses.filter(
    (license) => license.status === "expired"
  ).length;

  return { total, active, expiring, expired };
};

// Producers component with Firebase integration and location filtering
const Producers: React.FC = () => {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [filteredProducers, setFilteredProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [locationCounts, setLocationCounts] = useState<{
    [key: string]: number;
  }>({
    Austin: 0,
    Charlotte: 0,
    Unknown: 0,
  });
  const [editingProducer, setEditingProducer] = useState<{
    id: string;
    name: string;
    location: string;
  } | null>(null);
  const [newProducer, setNewProducer] = useState<Partial<Producer>>({
    name: "",
    npn: "",
    location: "Austin",
    email: "",
    phone: "",
  });
  const [selectedProducers, setSelectedProducers] = useState<string[]>([]);
  const [showBulkEdit, setShowBulkEdit] = useState<boolean>(false);
  const [bulkLocation, setBulkLocation] = useState<string>("Austin");
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [licenses, setLicenses] = useState<License[]>([]);

  const fetchProducers = async () => {
    try {
      setLoading(true);
      setIsLoading(true);

      // Fetch both producers and licenses in parallel
      const [data, licenseData] = await Promise.all([
        getProducers(),
        getLicenses(),
      ]);

      // Add active status if missing (default to true for existing records)
      const processedData = data.map((producer) => ({
        ...producer,
        active: producer.active === undefined ? true : producer.active,
      }));

      setProducers(processedData);
      setLicenses(licenseData);

      // Calculate location counts
      const counts = processedData.reduce((acc, producer) => {
        const location = producer.location || "Unknown";
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {});

      setLocationCounts(counts);
    } catch (err) {
      console.error("Error fetching producers:", err);
      setError("Failed to load producers");
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducers();
  }, []);

  // Apply location filter when it changes
  useEffect(() => {
    let result = [...producers];

    // Apply location filter
    if (locationFilter) {
      result = result.filter((p) => p.location === locationFilter);
    }

    // Apply active/inactive filter (assuming inactive producers have an 'active' field set to false)
    if (!showInactive) {
      result = result.filter((p) => p.active !== false);
    }

    setFilteredProducers(result);
  }, [locationFilter, producers, showInactive]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewProducer((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newProducer.name || !newProducer.npn || !newProducer.location) {
        alert("Please fill in all required fields");
        return;
      }

      await addProducer(newProducer as Producer);
      setNewProducer({
        name: "",
        npn: "",
        location: "Austin",
        email: "",
        phone: "",
      });
      setShowAddForm(false);
      fetchProducers();
    } catch (err) {
      console.error("Error adding producer:", err);
      setError("Failed to add producer");
    }
  };

  const handleEditLocation = (producer: Producer) => {
    setEditingProducer({
      id: producer.id!,
      name: producer.name,
      location: producer.location || "Unknown",
    });
  };

  const handleSaveLocation = async () => {
    if (!editingProducer) return;

    try {
      await updateProducer(editingProducer.id, {
        location: editingProducer.location,
      });
      setEditingProducer(null);
      fetchProducers();
    } catch (err) {
      console.error("Error updating producer location:", err);
      setError("Failed to update producer location");
    }
  };

  const handleCancelEdit = () => {
    setEditingProducer(null);
  };

  const toggleProducerSelection = (producerId: string) => {
    if (selectedProducers.includes(producerId)) {
      setSelectedProducers((prev) => prev.filter((id) => id !== producerId));
    } else {
      setSelectedProducers((prev) => [...prev, producerId]);
    }
  };

  const selectAllDisplayed = () => {
    if (selectedProducers.length === filteredProducers.length) {
      // If all are selected, deselect all
      setSelectedProducers([]);
    } else {
      // Otherwise select all currently filtered producers
      setSelectedProducers(filteredProducers.map((p) => p.id as string));
    }
  };

  const handleBulkLocationUpdate = async () => {
    if (selectedProducers.length === 0) {
      alert("Please select at least one producer");
      return;
    }

    try {
      const updates: { [key: string]: string } = {};

      // Create updates for each selected producer
      for (const producerId of selectedProducers) {
        updates[`producers/${producerId}/location`] = bulkLocation;
      }

      // Update multiple locations at once
      await update(ref(database), updates);

      // Refresh data and reset selection
      fetchProducers();
      setSelectedProducers([]);
      setShowBulkEdit(false);

      alert(
        `Successfully updated ${selectedProducers.length} producers to ${bulkLocation}`
      );
    } catch (err) {
      console.error("Error updating producer locations:", err);
      setError("Failed to update producer locations");
    }
  };

  // Add a function to get current page items
  const getCurrentPageItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredProducers.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Add a function to handle page changes
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Add a function to toggle active status
  const toggleActiveStatus = async (
    producerId: string,
    currentActive: boolean
  ) => {
    try {
      await updateProducer(producerId, { active: !currentActive });
      fetchProducers();
    } catch (err) {
      console.error("Error updating producer active status:", err);
      setError("Failed to update producer status");
    }
  };

  if (loading && producers.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Producers</h2>
        <div className="text-center py-10">
          <p className="text-gray-500">Loading producers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Producers</h2>
        <div className="flex items-center gap-4">
          <div>
            <label className="mr-2">Filter by Location:</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="form-select mb-0 inline-block w-auto"
            >
              <option value="">All Locations</option>
              <option value="Austin">Austin</option>
              <option value="Charlotte">Charlotte</option>
              {locationCounts["Unknown"] > 0 && (
                <option value="Unknown">Unknown</option>
              )}
            </select>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          >
            <FaUsers className={showAddForm ? "transform rotate-45" : ""} />
            <span>{showAddForm ? "Cancel" : "Add Producer"}</span>
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowBulkEdit(!showBulkEdit)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors`}
          >
            <IoLocationSharp size={16} />
            <span>Bulk Edit Locations</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={() => setShowInactive(!showInactive)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <label htmlFor="showInactive" className="text-sm text-gray-600">
              Show Inactive Agents
            </label>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-blue-200 bg-white rounded-md p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-blue-700 font-semibold mb-1">Austin</div>
            <div className="text-2xl font-bold text-gray-800">
              {locationCounts["Austin"] || 0}
            </div>
            <div className="text-sm text-gray-600">Producers</div>
            <div className="mt-2 flex justify-end">
              <div className="p-1 rounded-full bg-blue-50">
                <FaUsers className="text-blue-500" size={16} />
              </div>
            </div>
          </div>

          <div className="border border-purple-200 bg-white rounded-md p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-purple-700 font-semibold mb-1">Charlotte</div>
            <div className="text-2xl font-bold text-gray-800">
              {locationCounts["Charlotte"] || 0}
            </div>
            <div className="text-sm text-gray-600">Producers</div>
            <div className="mt-2 flex justify-end">
              <div className="p-1 rounded-full bg-purple-50">
                <FaUsers className="text-purple-500" size={16} />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white rounded-md p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-gray-700 font-semibold mb-1">
              Total Producers
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {producers.length}
            </div>
            <div className="text-sm text-gray-600">
              {licenses.length > 0
                ? `Managing ${licenses.length} licenses`
                : "No licenses yet"}
            </div>
            <div className="mt-2 flex justify-end">
              <div className="p-1 rounded-full bg-gray-50">
                <FaUsers className="text-gray-500" size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Edit Location Modal */}
      {editingProducer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-4">
              Edit Producer Location
            </h3>
            <p className="mb-4">
              Update location for <strong>{editingProducer.name}</strong>
            </p>
            <div className="mb-4">
              <label className="form-label">Location</label>
              <select
                value={editingProducer.location}
                onChange={(e) =>
                  setEditingProducer({
                    ...editingProducer,
                    location: e.target.value,
                  })
                }
                className="form-select"
              >
                <option value="Austin">Austin</option>
                <option value="Charlotte">Charlotte</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocation}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="card mb-6">
          <h3 className="text-xl font-semibold mb-4">Add New Producer</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2-col">
              <div>
                <label className="form-label">Name*</label>
                <input
                  type="text"
                  name="name"
                  value={newProducer.name}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">
                  NPN* (National Producer Number)
                </label>
                <input
                  type="text"
                  name="npn"
                  value={newProducer.npn}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Location*</label>
                <select
                  name="location"
                  value={newProducer.location}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="Austin">Austin</option>
                  <option value="Charlotte">Charlotte</option>
                </select>
              </div>
              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newProducer.email}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={newProducer.phone}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              {locationFilter && (
                <div className="text-sm text-gray-500">
                  Note: New producer will show in list if location matches
                  filter ({locationFilter})
                </div>
              )}
              <button type="submit" className="button button-green">
                Save Producer
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {filteredProducers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            {producers.length === 0
              ? "No producers found. Add your first producer!"
              : "No producers match the selected location filter."}
          </p>
        ) : (
          <div>
            <div className="mb-2 text-sm text-gray-500">
              Showing{" "}
              {Math.min(currentPage * itemsPerPage, filteredProducers.length)}{" "}
              of {filteredProducers.length} producers
            </div>
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {showBulkEdit && (
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedProducers.length ===
                            filteredProducers.length &&
                          filteredProducers.length > 0
                        }
                        onChange={selectAllDisplayed}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="p-3 text-left font-medium text-gray-800">
                    Name
                  </th>
                  <th className="p-3 text-left font-medium text-gray-800">
                    NPN
                  </th>
                  <th className="p-3 text-left font-medium text-gray-800">
                    Location
                  </th>
                  <th className="p-3 text-left font-medium text-gray-800">
                    Email
                  </th>
                  <th className="p-3 text-left font-medium text-gray-800">
                    Phone
                  </th>
                  <th className="p-3 text-left font-medium text-gray-800">
                    Status
                  </th>
                  <th className="p-3 text-center font-medium text-gray-800">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={showBulkEdit ? 8 : 7}
                      className="text-center py-4"
                    >
                      <p className="text-gray-500">Loading producers...</p>
                    </td>
                  </tr>
                ) : (
                  getCurrentPageItems().map((producer) => (
                    <tr key={producer.id} className="hover:bg-gray-50">
                      {showBulkEdit && (
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedProducers.includes(
                              producer.id as string
                            )}
                            onChange={() =>
                              toggleProducerSelection(producer.id as string)
                            }
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}

                      <td className="p-3">
                        <div className="font-medium text-gray-900">
                          {producer.name}
                        </div>
                        {licenses.length > 0 && (
                          <div className="flex items-center mt-1">
                            <div className="inline-flex items-center">
                              <span className="inline-flex items-center justify-center w-5 h-5 mr-1 rounded-full bg-gray-100 text-gray-700">
                                <FaFileAlt size={10} />
                              </span>
                              <span className="text-xs text-gray-600">
                                {
                                  getLicenseCountsForProducer(
                                    producer.id,
                                    licenses
                                  ).total
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center">
                          <div className="flex items-center">
                            <FaIdCard
                              className="text-gray-500 mr-1"
                              size={12}
                            />
                            <span className="text-gray-600">
                              {producer.npn}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`
                          px-2 py-1 rounded text-xs font-medium
                          ${
                            producer.location === "Austin"
                              ? "bg-blue-100 text-blue-700"
                              : producer.location === "Charlotte"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        `}
                          >
                            {producer.location || "Unknown"}
                          </span>
                          <button
                            onClick={() => handleEditLocation(producer)}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Location"
                          >
                            <FaEdit size={12} />
                          </button>
                        </div>
                      </td>

                      <td className="p-3 text-gray-600">
                        {producer.email || "—"}
                      </td>

                      <td className="p-3 text-gray-600">
                        {producer.phone || "—"}
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() =>
                            toggleActiveStatus(
                              producer.id as string,
                              producer.active !== false
                            )
                          }
                          className={`
                          inline-flex items-center px-2 py-1 rounded text-xs
                          ${
                            producer.active !== false
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        `}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mr-1 ${
                              producer.active !== false
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          ></div>
                          {producer.active !== false ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${producer.name}?`)) {
                              deleteProducer(producer.id!)
                                .then(fetchProducers)
                                .catch((err) => {
                                  console.error(
                                    "Error deleting producer:",
                                    err
                                  );
                                  setError("Failed to delete producer");
                                });
                            }
                          }}
                          className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Producer"
                        >
                          <FaTrashAlt size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing{" "}
          {Math.min(currentPage * itemsPerPage, filteredProducers.length)} of{" "}
          {filteredProducers.length} producers
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-2 py-1 text-sm rounded border ${
              currentPage === 1
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Previous
          </button>

          {Array.from({
            length: Math.ceil(filteredProducers.length / itemsPerPage),
          }).map((_, index) => {
            // Only show a limited number of page buttons
            if (
              index === 0 || // First page
              index ===
                Math.ceil(filteredProducers.length / itemsPerPage) - 1 || // Last page
              (index >= currentPage - 2 && index <= currentPage + 2) // Pages around current
            ) {
              return (
                <button
                  key={index}
                  onClick={() => handlePageChange(index + 1)}
                  className={`px-2 py-1 text-sm rounded border ${
                    currentPage === index + 1
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {index + 1}
                </button>
              );
            } else if (
              (index === currentPage - 3 && currentPage > 3) ||
              (index === currentPage + 3 &&
                currentPage <
                  Math.ceil(filteredProducers.length / itemsPerPage) - 3)
            ) {
              // Show ellipsis
              return (
                <span key={index} className="px-2 py-1">
                  ...
                </span>
              );
            }
            return null;
          })}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={
              currentPage === Math.ceil(filteredProducers.length / itemsPerPage)
            }
            className={`px-2 py-1 text-sm rounded border ${
              currentPage === Math.ceil(filteredProducers.length / itemsPerPage)
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// Licenses component with Firebase integration
const LicensesComponent: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [filteredLicenses, setFilteredLicenses] = useState<License[]>([]);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [bulkAddMode, setBulkAddMode] = useState<boolean>(false);
  const [selectedStateFee, setSelectedStateFee] = useState<number>(0);
  const [filters, setFilters] = useState({
    state: "",
    type: "",
    status: "",
    producerId: "",
    expirationYear: "",
    searchTerm: "",
    location: "",
  });
  const [newLicense, setNewLicense] = useState<Partial<License>>({
    state: "",
    type: "",
    producerId: "",
    startDate: new Date().toISOString().split("T")[0],
    expirationDate: "",
    licenseNumber: "",
  });
  // Track scroll position
  const scrollPositionRef = useRef<number>(0);
  // Add quick filter state
  const [quickFilterView, setQuickFilterView] = useState<string>("all"); // all, expiring, byAgent
  const [sortField, setSortField] = useState<string>("state");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Save scroll position
  const saveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
  };

  // Restore scroll position
  const restoreScrollPosition = () => {
    setTimeout(() => {
      window.scrollTo(0, scrollPositionRef.current);
    }, 100);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [licenseData, producerData] = await Promise.all([
        getLicenses(),
        getProducers(),
      ]);

      // Add producer name and location to licenses for easier filtering and display
      const licensesWithProducerInfo = licenseData.map((license) => {
        const producer = producerData.find((p) => p.id === license.producerId);
        return {
          ...license,
          producerName: producer ? producer.name : "Unknown Producer",
          producerLocation: producer ? producer.location : "Unknown",
        };
      });

      setLicenses(licensesWithProducerInfo);
      setFilteredLicenses(licensesWithProducerInfo);
      setProducers(producerData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
      restoreScrollPosition();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters whenever filters or licenses change
  useEffect(() => {
    let result = [...licenses];

    // Apply quick filters first
    if (quickFilterView === "expiring") {
      const now = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(now.getMonth() + 3);

      result = result.filter((license) => {
        const expirationDate = new Date(license.expirationDate);
        return expirationDate > now && expirationDate <= threeMonthsFromNow;
      });
    }

    // Apply regular filters
    if (filters.state) {
      result = result.filter((license) => license.state === filters.state);
    }

    if (filters.type) {
      result = result.filter((license) => license.type === filters.type);
    }

    if (filters.status) {
      result = result.filter((license) => license.status === filters.status);
    }

    if (filters.producerId) {
      result = result.filter(
        (license) => license.producerId === filters.producerId
      );
    }

    // Add location filter
    if (filters.location) {
      result = result.filter(
        (license) => license.producerLocation === filters.location
      );
    }

    // Add expiration year filter
    if (filters.expirationYear) {
      result = result.filter((license) => {
        const expirationYear = new Date(license.expirationDate)
          .getFullYear()
          .toString();
        return expirationYear === filters.expirationYear;
      });
    }

    // Add search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(
        (license) =>
          (license.licenseNumber &&
            license.licenseNumber.toLowerCase().includes(searchLower)) ||
          (license.producerName &&
            license.producerName.toLowerCase().includes(searchLower)) ||
          (license.state && license.state.toLowerCase().includes(searchLower))
      );
    }

    setFilteredLicenses(result);
  }, [filters, licenses, quickFilterView]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "state") {
      // Update state fee whenever state changes
      setSelectedStateFee(getLicenseFee(value));
    }

    setNewLicense((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    saveScrollPosition();
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQuickFilterChange = (filterView: string) => {
    saveScrollPosition();
    setQuickFilterView(filterView);
    // Reset other filters when using quick filters
    if (filterView !== "all") {
      setFilters({
        state: "",
        type: "",
        status: "",
        producerId: "",
        expirationYear: "",
        searchTerm: filters.searchTerm, // Keep search term
        location: filters.location, // Keep location filter
      });
    }
  };

  const clearFilters = () => {
    saveScrollPosition();
    setFilters({
      state: "",
      type: "",
      status: "",
      producerId: "",
      expirationYear: "",
      searchTerm: "",
      location: "", // Reset location filter
    });
    setQuickFilterView("all");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    saveScrollPosition();
    try {
      if (
        !newLicense.state ||
        !newLicense.type ||
        !newLicense.producerId ||
        !newLicense.expirationDate ||
        !newLicense.licenseNumber
      ) {
        alert("Please fill in all required fields");
        return;
      }

      // Add producer name when creating a new license
      const producer = producers.find((p) => p.id === newLicense.producerId);
      const licenseWithProducerName = {
        ...newLicense,
        producerName: producer ? producer.name : "Unknown Producer",
      };

      await addLicense(licenseWithProducerName as License);
      setNewLicense({
        state: "",
        type: "",
        producerId: "",
        startDate: new Date().toISOString().split("T")[0],
        expirationDate: "",
        licenseNumber: "",
      });
      setSelectedStateFee(0);

      if (!bulkAddMode) {
        setShowAddForm(false);
      }

      fetchData();
    } catch (err) {
      console.error("Error adding license:", err);
      setError("Failed to add license");
    }
  };

  const handleBulkAddToggle = () => {
    setBulkAddMode(!bulkAddMode);
  };

  const getStatusClass = (status?: string) => {
    switch (status) {
      case "expired":
        return "bg-red-100 text-red-700";
      case "expiring":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  // Get array of unique expiration years from licenses
  const getExpirationYears = () => {
    const years = new Set<string>();
    licenses.forEach((license) => {
      if (license.expirationDate) {
        const year = new Date(license.expirationDate).getFullYear().toString();
        years.add(year);
      }
    });
    return Array.from(years).sort();
  };

  // Get count of licenses by agent
  const getLicenseCountsByAgent = () => {
    return producers
      .map((producer) => {
        const producerLicenses = licenses.filter(
          (license) => license.producerId === producer.id
        );
        return {
          ...producer,
          licenseCount: producerLicenses.length,
          licenseTypes: producerLicenses.reduce((acc, license) => {
            acc[license.type] = (acc[license.type] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number }),
        };
      })
      .sort((a, b) => b.licenseCount - a.licenseCount); // Sort by license count descending
  };

  // Get unique locations from producers
  const getUniqueLocations = () => {
    const locations = new Set<string>();
    producers.forEach((producer) => {
      if (producer.location) {
        locations.add(producer.location);
      }
    });
    return Array.from(locations).sort();
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedLicenses = () => {
    if (!sortField) return filteredLicenses;

    return [...filteredLicenses].sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];

      // Handle special cases for formatting
      if (sortField === "expirationDate") {
        aValue = new Date(aValue || "").getTime();
        bValue = new Date(bValue || "").getTime();
      } else if (sortField === "fee") {
        aValue = getLicenseFee(a.state);
        bValue = getLicenseFee(b.state);
      }

      // Handle null/undefined
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      // Sort logic
      if (typeof aValue === "string") {
        const result = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? result : -result;
      } else {
        const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return sortDirection === "asc" ? result : -result;
      }
    });
  };

  const sortedLicenses = getSortedLicenses();

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field)
      return <i className="fa-solid fa-sort text-gray-300 ml-1"></i>;
    return sortDirection === "asc" ? (
      <i className="fa-solid fa-sort-up text-indigo-600 ml-1"></i>
    ) : (
      <i className="fa-solid fa-sort-down text-indigo-600 ml-1"></i>
    );
  };

  // Get current page items
  const getCurrentPageItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return sortedLicenses.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Scroll to top of table when page changes
    const tableContainer = document.querySelector(".license-table-container");
    if (tableContainer) {
      tableContainer.scrollTop = 0;
    }
    window.scrollTo(0, window.scrollY - 100);
  };

  if (loading && licenses.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Licenses</h2>
        <div className="text-center py-10">
          <p className="text-gray-500">Loading licenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Licenses</h2>
        <div className="flex gap-4">
          <div>
            {showAddForm && (
              <label className="flex items-center mr-4">
                <input
                  type="checkbox"
                  checked={bulkAddMode}
                  onChange={handleBulkAddToggle}
                  className="mr-2"
                />
                <span>Bulk Add Mode</span>
              </label>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="button button-blue"
            disabled={producers.length === 0}
          >
            {showAddForm ? "Cancel" : "Add License"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {producers.length === 0 && !loading && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>You need to add producers before you can add licenses.</p>
        </div>
      )}

      {/* Quick filter tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleQuickFilterChange("all")}
              className={`mr-1 py-2 px-4 text-sm font-medium ${
                quickFilterView === "all"
                  ? "border-b-2 border-indigo-500 text-indigo-600"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <i className="fa-solid fa-list-ul mr-2"></i>
              All Licenses
            </button>
            <button
              onClick={() => handleQuickFilterChange("expiring")}
              className={`mr-1 py-2 px-4 text-sm font-medium ${
                quickFilterView === "expiring"
                  ? "border-b-2 border-indigo-500 text-indigo-600"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <i className="fa-solid fa-calendar-xmark mr-2"></i>
              Expiring Soon (Next 3 months)
            </button>
            <button
              onClick={() => handleQuickFilterChange("byAgent")}
              className={`mr-1 py-2 px-4 text-sm font-medium ${
                quickFilterView === "byAgent"
                  ? "border-b-2 border-indigo-500 text-indigo-600"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <i className="fa-solid fa-users mr-2"></i>
              View by Agent
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agent
            </label>
            <select
              name="producerId"
              value={filters.producerId}
              onChange={handleFilterChange}
              className="form-select block w-full sm:text-sm rounded-md"
            >
              <option value="">All Agents</option>
              {producers.map((producer) => (
                <option key={producer.id} value={producer.id}>
                  {producer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              name="state"
              value={filters.state}
              onChange={handleFilterChange}
              className="form-select block w-full sm:text-sm rounded-md"
            >
              <option value="">All States</option>
              {stateLicenseCosts.map((state) => (
                <option key={state.state} value={state.state}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Type
            </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="form-select block w-full sm:text-sm rounded-md"
            >
              <option value="">All Types</option>
              {licenseTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="form-select block w-full sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration Year
            </label>
            <select
              name="expirationYear"
              value={filters.expirationYear}
              onChange={handleFilterChange}
              className="form-select block w-full sm:text-sm rounded-md"
            >
              <option value="">All Years</option>
              {getExpirationYears().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agent Location
            </label>
            <select
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="form-select block w-full sm:text-sm rounded-md"
            >
              <option value="">All Locations</option>
              {getUniqueLocations().map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-auto flex-grow">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              placeholder="Search by license #, agent, state..."
              className="form-input block w-full sm:text-sm rounded-md"
            />
          </div>

          <div className="w-full md:w-auto">
            <button
              onClick={clearFilters}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <i className="fa-solid fa-filter-circle-xmark mr-2"></i>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="card mb-6">
          <h3 className="text-xl font-semibold mb-4">Add New License</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2-col">
              <div>
                <label className="form-label">Producer*</label>
                <select
                  name="producerId"
                  value={newLicense.producerId}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Select Producer</option>
                  {producers.map((producer) => (
                    <option key={producer.id} value={producer.id}>
                      {producer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">State*</label>
                <select
                  name="state"
                  value={newLicense.state}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Select State</option>
                  {stateLicenseCosts.map((state) => (
                    <option key={state.state} value={state.state}>
                      {state.name} ({state.state}) - ${state.fee}
                    </option>
                  ))}
                </select>
                {selectedStateFee > 0 && (
                  <div className="mt-1 text-sm text-blue-600">
                    License Fee: ${selectedStateFee}
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">License Type*</label>
                <select
                  name="type"
                  value={newLicense.type}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Select Type</option>
                  {licenseTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">License Number*</label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={newLicense.licenseNumber}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={newLicense.startDate}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Expiration Date*</label>
                <input
                  type="date"
                  name="expirationDate"
                  value={newLicense.expirationDate}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className="button button-green">
                {bulkAddMode ? "Save & Add Another" : "Save License"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View by Agent Layout */}
      {quickFilterView === "byAgent" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getLicenseCountsByAgent().map((agent) =>
            agent.licenseCount > 0 ? (
              <div key={agent.id} className="card p-4 h-full">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold">{agent.name}</h3>
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    {agent.licenseCount} licenses
                  </span>
                </div>

                <div className="text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <i className="fa-solid fa-id-card text-gray-500 text-xs"></i>
                    <span>NPN: {agent.npn}</span>
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    <i className="fa-solid fa-location-dot text-gray-500 text-xs"></i>
                    <span
                      className={`
                      ${
                        agent.location === "Austin"
                          ? "text-blue-600"
                          : agent.location === "Charlotte"
                          ? "text-purple-600"
                          : "text-gray-600"
                      }
                    `}
                    >
                      {agent.location || "Unknown location"}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    License Types:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(agent.licenseTypes).map(([type, count]) => (
                      <span
                        key={type}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700"
                      >
                        {type} ({count})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setFilters((prev) => ({
                        ...prev,
                        producerId: agent.id as string,
                      }));
                      setQuickFilterView("all");
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    <i className="fa-solid fa-list-ul mr-1"></i>
                    View all licenses
                  </button>
                </div>
              </div>
            ) : null
          )}
        </div>
      ) : (
        <div className="card">
          {filteredLicenses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {licenses.length === 0
                ? "No licenses found. Add your first license!"
                : "No licenses match your filter criteria."}
            </p>
          ) : (
            <div>
              <div className="mb-2 text-sm text-gray-500">
                Showing{" "}
                {Math.min(currentPage * itemsPerPage, filteredLicenses.length)}{" "}
                of {filteredLicenses.length} licenses
              </div>
              <div className="license-table-container">
                <table className="license-table w-full border-collapse bg-white rounded-lg overflow-hidden">
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleSort("state")}
                        className="cursor-pointer"
                      >
                        State <SortIcon field="state" />
                      </th>
                      <th
                        onClick={() => handleSort("type")}
                        className="cursor-pointer"
                      >
                        Type <SortIcon field="type" />
                      </th>
                      <th
                        onClick={() => handleSort("producerName")}
                        className="cursor-pointer"
                      >
                        Producer <SortIcon field="producerName" />
                      </th>
                      <th
                        onClick={() => handleSort("licenseNumber")}
                        className="cursor-pointer"
                      >
                        License # <SortIcon field="licenseNumber" />
                      </th>
                      <th
                        onClick={() => handleSort("expirationDate")}
                        className="cursor-pointer"
                      >
                        Expiration <SortIcon field="expirationDate" />
                      </th>
                      <th
                        onClick={() => handleSort("fee")}
                        className="cursor-pointer"
                      >
                        Fee <SortIcon field="fee" />
                      </th>
                      <th
                        onClick={() => handleSort("status")}
                        className="cursor-pointer"
                      >
                        Status <SortIcon field="status" />
                      </th>
                      <th
                        onClick={() => handleSort("producerLocation")}
                        className="cursor-pointer"
                      >
                        Location <SortIcon field="producerLocation" />
                      </th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentPageItems().map((license) => (
                      <tr key={license.id}>
                        <td className="state-cell">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                            {license.state}
                          </span>
                        </td>
                        <td>{license.type}</td>
                        <td className="font-medium">
                          {license.producerName || "—"}
                        </td>
                        <td>
                          <div className="flex items-center">
                            <i className="fa-solid fa-id-card text-gray-500 mr-2 text-xs"></i>
                            <span>{license.licenseNumber}</span>
                          </div>
                        </td>
                        <td className="expiration-cell">
                          {new Date(
                            license.expirationDate
                          ).toLocaleDateString()}
                        </td>
                        <td className="fee-cell">
                          ${getLicenseFee(license.state)}
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(
                              license.status
                            )}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                license.status === "expired"
                                  ? "bg-red-500"
                                  : license.status === "expiring"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                            ></span>
                            {license.status || "Active"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`
                            inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                            ${
                              license.producerLocation === "Austin"
                                ? "bg-blue-100 text-blue-700"
                                : license.producerLocation === "Charlotte"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }
                          `}
                          >
                            {license.producerLocation || "Unknown"}
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete license ${license.licenseNumber}?`
                                )
                              ) {
                                saveScrollPosition();
                                deleteLicense(license.id!)
                                  .then(fetchData)
                                  .catch((err) => {
                                    console.error(
                                      "Error deleting license:",
                                      err
                                    );
                                    setError("Failed to delete license");
                                  });
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete License"
                          >
                            <i className="fa-solid fa-trash-alt text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    filteredLicenses.length
                  )}{" "}
                  -{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredLicenses.length
                  )}{" "}
                  of {filteredLicenses.length} licenses
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <select
                      className="form-select text-sm rounded-md border-gray-300 px-2 py-1"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>

                    <span className="ml-2 text-sm text-gray-600">per page</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className={`px-2 py-1 text-sm rounded border ${
                        currentPage === 1
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                      title="First Page"
                    >
                      <i className="fa-solid fa-angles-left text-xs"></i>
                    </button>

                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-2 py-1 text-sm rounded border ${
                        currentPage === 1
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                      title="Previous Page"
                    >
                      <i className="fa-solid fa-angle-left text-xs"></i>
                    </button>

                    <span className="px-2 py-1 text-sm text-gray-600">
                      Page {currentPage} of{" "}
                      {Math.ceil(filteredLicenses.length / itemsPerPage)}
                    </span>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={
                        currentPage ===
                        Math.ceil(filteredLicenses.length / itemsPerPage)
                      }
                      className={`px-2 py-1 text-sm rounded border ${
                        currentPage ===
                        Math.ceil(filteredLicenses.length / itemsPerPage)
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                      title="Next Page"
                    >
                      <i className="fa-solid fa-angle-right text-xs"></i>
                    </button>

                    <button
                      onClick={() =>
                        handlePageChange(
                          Math.ceil(filteredLicenses.length / itemsPerPage)
                        )
                      }
                      disabled={
                        currentPage ===
                        Math.ceil(filteredLicenses.length / itemsPerPage)
                      }
                      className={`px-2 py-1 text-sm rounded border ${
                        currentPage ===
                        Math.ceil(filteredLicenses.length / itemsPerPage)
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                      title="Last Page"
                    >
                      <i className="fa-solid fa-angles-right text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<
    "dashboard" | "producers" | "licenses" | "import"
  >("dashboard");

  console.log("Current view:", view);

  const handleNavClick = (newView: typeof view) => {
    console.log("Button clicked, setting view to:", newView);
    setView(newView);
  };

  return (
    <div className="min-h-screen">
      <header className="app-header">
        <div className="container">
          <h1 className="app-title">Producer License Tracker</h1>
          <nav className="mt-4">
            <button
              onClick={() => handleNavClick("dashboard")}
              className={`nav-button ${view === "dashboard" ? "active" : ""}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleNavClick("producers")}
              className={`nav-button ${view === "producers" ? "active" : ""}`}
            >
              Producers
            </button>
            <button
              onClick={() => handleNavClick("licenses")}
              className={`nav-button ${view === "licenses" ? "active" : ""}`}
            >
              Licenses
            </button>
            <button
              onClick={() => handleNavClick("import")}
              className={`nav-button ${view === "import" ? "active" : ""}`}
            >
              Import Data
            </button>
          </nav>
        </div>
      </header>
      <main className="container p-4">
        {view === "dashboard" && <Dashboard />}
        {view === "producers" && <ProducerPage />}
        {view === "licenses" && <LicensesComponent />}
        {view === "import" && <DataImport />}
      </main>
    </div>
  );
};

export default App;
