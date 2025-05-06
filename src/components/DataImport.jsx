import React, { useState } from "react";
import { importProducerData, importLicenseData } from "../utils/dataImporter";
import { updateAllProducerLocations } from "../utils/updateLocations";

const DataImport = () => {
  const [importType, setImportType] = useState("producers");
  const [importData, setImportData] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isUpdatingLocations, setIsUpdatingLocations] = useState(false);
  const [results, setResults] = useState(null);
  const [locationResults, setLocationResults] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleImport = async () => {
    if (!importData.trim()) {
      alert("Please paste data to import");
      return;
    }

    setIsImporting(true);
    setResults(null);

    try {
      let importResults;

      if (importType === "producers") {
        importResults = await importProducerData(importData);
      } else {
        importResults = await importLicenseData(importData);
      }

      setResults(importResults);
    } catch (err) {
      console.error("Import error:", err);
      setResults({
        totalProducers: 0,
        totalLicenses: 0,
        errors: [`Import failed: ${err.message}`],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateLocations = async () => {
    setIsUpdatingLocations(true);
    setLocationResults(null);

    try {
      const results = await updateAllProducerLocations();
      setLocationResults(results);
    } catch (err) {
      console.error("Error updating locations:", err);
      setLocationResults({
        success: false,
        message: `Update failed: ${err.message}`,
      });
    } finally {
      setIsUpdatingLocations(false);
    }
  };

  return (
    <div className="p-4">
      <div className="card p-4 mb-4">
        <h2 className="text-xl font-bold mb-4">Data Import</h2>

        <div className="mb-4">
          <label className="form-label block mb-2">Import Type</label>
          <select
            className="form-select w-full"
            value={importType}
            onChange={(e) => setImportType(e.target.value)}
          >
            <option value="producers">Producers with Licenses</option>
            <option value="licenses">Licenses Only</option>
          </select>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="form-label block">Paste Data</label>
            <button
              type="button"
              className="text-blue-600 text-sm underline"
              onClick={() => setShowHelp(!showHelp)}
            >
              {showHelp ? "Hide Help" : "Show Help"}
            </button>
          </div>

          {showHelp && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3 text-sm">
              <p className="font-semibold mb-1">Import Instructions:</p>
              <p className="mb-2">
                {importType === "producers" ? (
                  <>
                    Copy data from Excel or Google Sheets and paste below. Data
                    should include these columns:
                    <br />
                    <code>
                      Start Date, Agent Tier, Total Licenses, GTL Agent Code,
                      Agent Name, NPN
                    </code>
                    <br />
                    followed by state columns (AK, AL, AR, etc.) with "Active"
                    values.
                  </>
                ) : (
                  <>
                    Data should be comma-separated with these columns:
                    <br />
                    <code>
                      Agent Code, State, License Number, Issue Date, Expiration
                      Date, Status
                    </code>
                  </>
                )}
              </p>
            </div>
          )}

          <textarea
            className="form-input w-full h-48 font-mono text-sm"
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder={`Paste your ${
              importType === "producers" ? "producer" : "license"
            } data here...`}
          />
        </div>

        <div className="flex justify-end">
          <button
            className="button button-blue"
            onClick={handleImport}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import Data"}
          </button>
        </div>

        {results && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Import Results</h3>

            <div className="flex space-x-4 mb-3">
              {importType === "producers" && (
                <div className="bg-green-100 rounded p-2 flex-1">
                  <span className="block text-sm text-green-800">
                    Producers Imported
                  </span>
                  <span className="text-xl font-bold text-green-900">
                    {results.totalProducers}
                  </span>
                </div>
              )}

              <div className="bg-green-100 rounded p-2 flex-1">
                <span className="block text-sm text-green-800">
                  Licenses Imported
                </span>
                <span className="text-xl font-bold text-green-900">
                  {results.totalLicenses}
                </span>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-red-700 mb-1">
                  Errors ({results.errors.length})
                </h4>
                <div className="bg-red-50 border border-red-200 rounded p-2 max-h-40 overflow-y-auto">
                  <ul className="text-xs text-red-800">
                    {results.errors.map((error, i) => (
                      <li key={i} className="mb-1">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="text-xl font-bold mb-4">Update Producer Locations</h2>
        <p className="mb-4 text-gray-600">
          This will update all producers in the database with their correct call
          center locations (Austin or Charlotte) based on the organization
          chart.
        </p>

        <div className="flex justify-end">
          <button
            className="button button-green"
            onClick={handleUpdateLocations}
            disabled={isUpdatingLocations}
          >
            {isUpdatingLocations ? "Updating..." : "Update Locations"}
          </button>
        </div>

        {locationResults && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">
              Location Update Results
            </h3>

            {locationResults.success ? (
              <div>
                <div className="bg-green-100 p-3 rounded mb-4">
                  <p className="text-green-800">
                    Successfully updated {locationResults.updatedCount}{" "}
                    producers with location information.
                  </p>
                </div>

                <h4 className="font-medium mb-2">Location Distribution:</h4>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-sm text-blue-700">Austin</div>
                    <div className="text-2xl font-bold">
                      {locationResults.locationCounts.Austin || 0}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="text-sm text-purple-700">Charlotte</div>
                    <div className="text-2xl font-bold">
                      {locationResults.locationCounts.Charlotte || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-sm text-gray-700">Unknown</div>
                    <div className="text-2xl font-bold">
                      {locationResults.locationCounts.Unknown || 0}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Total Producers: {locationResults.totalProducers}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Austin Producers */}
                  <div className="border rounded p-3">
                    <h4 className="font-medium mb-2 text-blue-700">
                      Austin Producers (
                      {locationResults.producersAustin?.length || 0})
                    </h4>
                    <div className="max-h-64 overflow-y-auto text-sm">
                      {locationResults.producersAustin?.length > 0 ? (
                        <ul className="list-disc pl-5">
                          {locationResults.producersAustin.map(
                            (name, index) => (
                              <li key={index}>{name}</li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p className="text-gray-500">
                          No producers assigned to Austin
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Charlotte Producers */}
                  <div className="border rounded p-3">
                    <h4 className="font-medium mb-2 text-purple-700">
                      Charlotte Producers (
                      {locationResults.producersCharlotte?.length || 0})
                    </h4>
                    <div className="max-h-64 overflow-y-auto text-sm">
                      {locationResults.producersCharlotte?.length > 0 ? (
                        <ul className="list-disc pl-5">
                          {locationResults.producersCharlotte.map(
                            (name, index) => (
                              <li key={index}>{name}</li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p className="text-gray-500">
                          No producers assigned to Charlotte
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unknown Producers */}
                {locationResults.producersUnknown?.length > 0 && (
                  <div className="border rounded p-3 mt-4">
                    <h4 className="font-medium mb-2 text-gray-700">
                      Unassigned Producers (
                      {locationResults.producersUnknown.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto text-sm">
                      <ul className="list-disc pl-5">
                        {locationResults.producersUnknown.map((name, index) => (
                          <li key={index}>{name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-100 p-3 rounded">
                <p className="text-red-800">
                  Failed to update locations: {locationResults.message}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataImport;
