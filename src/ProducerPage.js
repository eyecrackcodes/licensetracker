import React, { useState, useEffect } from "react";
import {
  getProducers,
  getLicenses,
  deleteProducer,
  updateProducer,
} from "./services/dataService.js";
import { database } from "./firebase.js";
import { ref, update } from "firebase/database";

const ProducerPage = () => {
  const [producers, setProducers] = useState([]);
  const [filteredProducers, setFilteredProducers] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProducers, setSelectedProducers] = useState([]);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkLocation, setBulkLocation] = useState("Austin");
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [locationFilter, setLocationFilter] = useState("");
  const [locationCounts, setLocationCounts] = useState({
    Austin: 0,
    Charlotte: 0,
    Unknown: 0,
  });
  const [editingProducer, setEditingProducer] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch producers and licenses
      const [producerData, licenseData] = await Promise.all([
        getProducers(),
        getLicenses(),
      ]);

      // Ensure all producers have an active field
      const processedData = producerData.map((producer) => ({
        ...producer,
        active: producer.active === undefined ? true : producer.active,
      }));

      setProducers(processedData);
      setLicenses(licenseData);

      // Apply filters
      applyFilters(processedData);

      // Calculate location counts
      const counts = processedData.reduce((acc, producer) => {
        const location = producer.location || "Unknown";
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {});

      setLocationCounts(counts);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to the producer list
  const applyFilters = (data) => {
    let filtered = [...data];

    // Apply location filter
    if (locationFilter) {
      filtered = filtered.filter((p) => p.location === locationFilter);
    }

    // Apply active/inactive filter
    if (!showInactive) {
      filtered = filtered.filter((p) => p.active !== false);
    }

    setFilteredProducers(filtered);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters when location filter or showInactive changes
  useEffect(() => {
    applyFilters(producers);
  }, [locationFilter, showInactive, producers]);

  // Get current page items
  const getCurrentPageItems = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredProducers.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Handle page changes
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Toggle producer selection for bulk edit
  const toggleProducerSelection = (producerId) => {
    if (selectedProducers.includes(producerId)) {
      setSelectedProducers((prev) => prev.filter((id) => id !== producerId));
    } else {
      setSelectedProducers((prev) => [...prev, producerId]);
    }
  };

  // Select all displayed producers
  const selectAllDisplayed = () => {
    if (selectedProducers.length === filteredProducers.length) {
      setSelectedProducers([]);
    } else {
      setSelectedProducers(filteredProducers.map((p) => p.id));
    }
  };

  // Perform bulk update
  const handleBulkLocationUpdate = async () => {
    if (selectedProducers.length === 0) {
      alert("Please select at least one producer");
      return;
    }

    try {
      const updates = {};

      // Create updates for each selected producer
      for (const producerId of selectedProducers) {
        updates[`producers/${producerId}/location`] = bulkLocation;
      }

      // Update multiple locations at once
      await update(ref(database), updates);

      // Refresh data and reset selection
      fetchData();
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

  // Toggle producer active status
  const toggleActiveStatus = async (producerId, currentActive) => {
    try {
      await updateProducer(producerId, { active: !currentActive });
      fetchData();
    } catch (err) {
      console.error("Error updating producer active status:", err);
      setError("Failed to update producer status");
    }
  };

  // Handle edit location
  const handleEditLocation = (producer) => {
    setEditingProducer({
      id: producer.id,
      name: producer.name,
      location: producer.location || "Unknown",
    });
  };

  // Save edited location
  const handleSaveLocation = async () => {
    if (!editingProducer) return;

    try {
      await updateProducer(editingProducer.id, {
        location: editingProducer.location,
      });
      setEditingProducer(null);
      fetchData();
    } catch (err) {
      console.error("Error updating producer location:", err);
      setError("Failed to update producer location");
    }
  };

  // Count licenses for a producer
  const getLicenseCountsForProducer = (producerId) => {
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
      <h2 className="text-2xl font-bold mb-4">Producers</h2>

      {/* Filter controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="mr-2">Filter by Location:</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="form-select border rounded p-2"
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
            onClick={() => setShowBulkEdit(!showBulkEdit)}
            className="app-button button-primary"
          >
            <i className="fas fa-map-marker-alt"></i>
            <span>Bulk Edit Locations</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={() => setShowInactive(!showInactive)}
              className="mr-2"
            />
            <span>Show Inactive Agents</span>
          </label>
        </div>
      </div>

      {/* Bulk edit controls */}
      {showBulkEdit && (
        <div className="app-card mb-4 flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-600 mr-2">
              {selectedProducers.length} producer(s) selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkLocation}
              onChange={(e) => setBulkLocation(e.target.value)}
              className="border rounded p-2"
            >
              <option value="Austin">Austin</option>
              <option value="Charlotte">Charlotte</option>
              <option value="Unknown">Unknown</option>
            </select>
            <button
              onClick={handleBulkLocationUpdate}
              className="app-button button-success"
              disabled={selectedProducers.length === 0}
            >
              <i className="fas fa-save"></i>
              <span>Update Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Location cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="app-card">
          <div className="flex items-center justify-between">
            <div className="text-blue-800 font-semibold">Austin</div>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <i className="fas fa-users text-blue-500"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {locationCounts["Austin"] || 0}
          </div>
          <div className="text-sm text-gray-600">Producers</div>
        </div>

        <div className="app-card">
          <div className="flex items-center justify-between">
            <div className="text-purple-800 font-semibold">Charlotte</div>
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <i className="fas fa-users text-purple-500"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {locationCounts["Charlotte"] || 0}
          </div>
          <div className="text-sm text-gray-600">Producers</div>
        </div>

        <div className="app-card">
          <div className="flex items-center justify-between">
            <div className="text-gray-800 font-semibold">Total Producers</div>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <i className="fas fa-users text-gray-500"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {producers.length}
          </div>
          <div className="text-sm text-gray-600">
            {licenses.length > 0
              ? `Managing ${licenses.length} licenses`
              : "No licenses yet"}
          </div>
        </div>
      </div>

      {/* Error message */}
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
              <label className="block mb-2">Location</label>
              <select
                value={editingProducer.location}
                onChange={(e) =>
                  setEditingProducer({
                    ...editingProducer,
                    location: e.target.value,
                  })
                }
                className="w-full border rounded p-2"
              >
                <option value="Austin">Austin</option>
                <option value="Charlotte">Charlotte</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingProducer(null)}
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

      {/* Producer table */}
      <div className="app-card">
        <div className="mb-2 text-sm text-gray-500">
          Showing{" "}
          {Math.min(currentPage * itemsPerPage, filteredProducers.length)} of{" "}
          {filteredProducers.length} producers
        </div>
        <table className="app-table">
          <thead>
            <tr>
              {showBulkEdit && (
                <th>
                  <input
                    type="checkbox"
                    checked={
                      selectedProducers.length === filteredProducers.length &&
                      filteredProducers.length > 0
                    }
                    onChange={selectAllDisplayed}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              <th>Name</th>
              <th>NPN</th>
              <th>Location</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={showBulkEdit ? 8 : 7} className="text-center py-4">
                  <p className="text-gray-500">Loading producers...</p>
                </td>
              </tr>
            ) : (
              getCurrentPageItems().map((producer) => {
                const licenseCounts = getLicenseCountsForProducer(producer.id);

                return (
                  <tr key={producer.id}>
                    {showBulkEdit && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedProducers.includes(producer.id)}
                          onChange={() => toggleProducerSelection(producer.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td>
                      <div className="font-medium text-gray-900">
                        {producer.name}
                      </div>
                      {licenseCounts.total > 0 && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <i className="fas fa-file-alt text-gray-400 mr-1"></i>
                          <span>
                            {licenseCounts.total} license
                            {licenseCounts.total !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center">
                        <i className="fas fa-id-card text-gray-400 mr-1"></i>
                        <span>{producer.npn}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className={`location-badge ${
                            producer.location === "Austin"
                              ? "location-austin"
                              : producer.location === "Charlotte"
                              ? "location-charlotte"
                              : "location-unknown"
                          }`}
                        >
                          {producer.location || "Unknown"}
                        </span>
                        <button
                          onClick={() => handleEditLocation(producer)}
                          className="text-gray-500 hover:text-blue-600"
                          title="Edit Location"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </div>
                    </td>
                    <td>{producer.email || "—"}</td>
                    <td>{producer.phone || "—"}</td>
                    <td>
                      <button
                        onClick={() =>
                          toggleActiveStatus(
                            producer.id,
                            producer.active !== false
                          )
                        }
                        className={`status-badge ${
                          producer.active !== false
                            ? "status-active"
                            : "status-expired"
                        }`}
                      >
                        <i
                          className={`fas fa-${
                            producer.active !== false
                              ? "toggle-on"
                              : "toggle-off"
                          } mr-1`}
                        ></i>
                        {producer.active !== false ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${producer.name}?`)) {
                            deleteProducer(producer.id)
                              .then(fetchData)
                              .catch((err) => {
                                console.error("Error deleting producer:", err);
                                setError("Failed to delete producer");
                              });
                          }
                        }}
                        className="text-gray-500 hover:text-red-600"
                        title="Delete Producer"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination controls */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Items per page:
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-2 border rounded p-1"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 border rounded ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Previous
            </button>

            {Array.from({
              length: Math.ceil(filteredProducers.length / itemsPerPage),
            }).map((_, index) => {
              // Only show first, last, and pages around current
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
                    className={`px-3 py-1 border rounded ${
                      currentPage === index + 1
                        ? "bg-blue-100 text-blue-700 border-blue-300"
                        : "bg-white text-gray-700 hover:bg-gray-50"
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
                currentPage ===
                Math.ceil(filteredProducers.length / itemsPerPage)
              }
              className={`px-3 py-1 border rounded ${
                currentPage ===
                Math.ceil(filteredProducers.length / itemsPerPage)
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProducerPage;
