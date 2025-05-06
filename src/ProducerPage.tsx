import React, { useState, useEffect, useRef } from "react";
import {
  Producer,
  License,
  getProducers,
  getLicenses,
  addProducer,
  updateProducer,
  deleteProducer,
} from "./services/dataService.js";

import { database } from "./firebase.js";
import { ref, update } from "firebase/database";

// ProducerPage component
const ProducerPage: React.FC = () => {
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
  // Add this ref to track scroll position
  const scrollPositionRef = useRef<number>(0);

  // Function to save scroll position
  const saveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
  };

  // Function to restore scroll position
  const restoreScrollPosition = () => {
    setTimeout(() => {
      window.scrollTo(0, scrollPositionRef.current);
    }, 100);
  };

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
      // Restore scroll position after data fetch
      restoreScrollPosition();
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
    // Save scroll position before submitting
    saveScrollPosition();

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
    // Save scroll position before opening modal
    saveScrollPosition();
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

    // Save scroll position before update
    saveScrollPosition();

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

  // Get current page items
  const getCurrentPageItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredProducers.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page changes and save position
  const handlePageChange = (pageNumber: number) => {
    // Save scroll position before changing pages
    saveScrollPosition();
    setCurrentPage(pageNumber);
    // Scroll to top of producer table
    window.scrollTo({
      top: document.querySelector("table")?.offsetTop - 100 || 0,
      behavior: "smooth",
    });
  };

  // Toggle active status
  const toggleActiveStatus = async (
    producerId: string,
    currentActive: boolean
  ) => {
    // Save scroll position before toggling status
    saveScrollPosition();

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
            <i className={`fa-solid fa-${showAddForm ? "times" : "plus"}`}></i>
            <span>{showAddForm ? "Cancel" : "Add Producer"}</span>
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowBulkEdit(!showBulkEdit)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded ${
              showBulkEdit
                ? "bg-blue-100 border-blue-400"
                : "bg-blue-50 border-blue-200"
            } text-blue-700 hover:bg-blue-100 border transition-colors`}
          >
            <i className="fa-solid fa-location-dot"></i>
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
                <i className="fa-solid fa-users text-blue-500"></i>
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
                <i className="fa-solid fa-users text-purple-500"></i>
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
                <i className="fa-solid fa-users text-gray-500"></i>
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

      {/* Edit Location Modal - Updated with better visual feedback */}
      {editingProducer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full shadow-xl border-4 border-blue-300 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                <i className="fa-solid fa-location-dot text-blue-500 mr-2"></i>
                Edit Producer Location
              </h3>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 text-xs rounded-full">
                Editing Mode
              </span>
            </div>
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
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocation}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <i className="fa-solid fa-save mr-2"></i>
                Save Location
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
                                <i className="fa-solid fa-file-alt text-xs"></i>
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
                            <i className="fa-solid fa-id-card text-gray-500 mr-1 text-xs"></i>
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
                            <i className="fa-solid fa-edit text-xs"></i>
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
                          <i className="fa-solid fa-trash-alt text-xs"></i>
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

      {/* Pagination - Improved to clearly highlight current page */}
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
            <i className="fa-solid fa-chevron-left mr-1 text-xs"></i> Prev
          </button>

          {Array.from({
            length: Math.ceil(filteredProducers.length / itemsPerPage),
          }).map((_, index) => {
            // Only show certain page buttons
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
                  className={`w-8 h-8 flex items-center justify-center text-sm rounded border ${
                    currentPage === index + 1
                      ? "bg-blue-600 text-white border-blue-600 font-bold"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                  aria-current={currentPage === index + 1 ? "page" : undefined}
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
                <span
                  key={index}
                  className="w-8 h-8 flex items-center justify-center text-gray-500"
                >
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
            Next <i className="fa-solid fa-chevron-right ml-1 text-xs"></i>
          </button>
        </div>
      </div>

      {/* Bulk edit form */}
      {showBulkEdit && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-lg p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="font-medium text-blue-700">
              <i className="fa-solid fa-users-gear mr-2"></i>
              Bulk Edit Mode: {selectedProducers.length} selected
            </span>
            <select
              value={bulkLocation}
              onChange={(e) => setBulkLocation(e.target.value)}
              className="form-select mb-0 inline-block w-auto"
            >
              <option value="Austin">Austin</option>
              <option value="Charlotte">Charlotte</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkEdit(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkLocationUpdate}
              disabled={selectedProducers.length === 0}
              className={`px-4 py-2 rounded-md ${
                selectedProducers.length === 0
                  ? "bg-gray-300 cursor-not-allowed text-gray-500"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <i className="fa-solid fa-save mr-2"></i>
              Update Location
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProducerPage;
