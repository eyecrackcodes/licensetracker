import { database } from "../firebase.js";
import { ref, set, push, get, update } from "firebase/database";

// US State codes for validation
const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

// Helper functions
const calculateLicenseStatus = (expirationDate) => {
  if (!expirationDate) return "unknown";

  const today = new Date();
  const expiry = new Date(expirationDate);

  if (expiry < today) {
    return "expired";
  } else if (expiry < new Date(today.setDate(today.getDate() + 30))) {
    return "expiring";
  } else {
    return "active";
  }
};

/**
 * Process a CSV or Excel-like data string and import it into the database
 * @param {string} data - Tab/comma separated data string
 * @returns {Object} Results of the import operation
 */
export const importProducerData = async (data) => {
  const results = {
    totalProducers: 0,
    totalLicenses: 0,
    errors: [],
  };

  try {
    // Parse the data (assuming tab-separated values from Excel paste)
    const rows = data.split("\n").filter((row) => row.trim());

    // Extract header row
    const headers = rows[0].split("\t").map((h) => h.trim());

    // Find column indexes
    const startDateIdx = headers.findIndex((h) => h === "Start Date");
    const agentTierIdx = headers.findIndex((h) => h === "Agent Tier");
    const totalLicensesIdx = headers.findIndex((h) => h === "Total Licenses");
    const agentCodeIdx = headers.findIndex((h) => h === "GTL Agent Code");
    const nameIdx = headers.findIndex((h) => h === "Agent Name");
    const npnIdx = headers.findIndex((h) => h === "NPN");

    // Find state column indexes (assuming they start after NPN)
    const stateIndexes = {};
    for (let i = npnIdx + 1; i < headers.length; i++) {
      const stateCode = headers[i];
      if (US_STATES.includes(stateCode)) {
        stateIndexes[stateCode] = i;
      }
    }

    // Process each data row
    for (let r = 1; r < rows.length; r++) {
      const rowData = rows[r].split("\t");
      if (rowData.length < 6) continue; // Skip incomplete rows

      // Extract producer data
      const startDate = rowData[startDateIdx]
        ? new Date(rowData[startDateIdx])
        : null;
      const formattedDate = startDate
        ? startDate.toISOString().split("T")[0]
        : null;

      const producerData = {
        agentCode: rowData[agentCodeIdx]?.trim(),
        name: rowData[nameIdx]?.trim(),
        npn: rowData[npnIdx]?.trim(),
        tier: rowData[agentTierIdx]?.trim() || null,
        startDate: formattedDate,
        totalLicenses: parseInt(rowData[totalLicensesIdx] || "0"),
      };

      // Skip if missing required fields
      if (!producerData.agentCode || !producerData.name) {
        results.errors.push(
          `Row ${r + 1}: Missing required agent code or name`
        );
        continue;
      }

      // Check if producer already exists
      const producersSnapshot = await get(ref(database, "producers"));
      let existingProducerId = null;

      if (producersSnapshot.exists()) {
        producersSnapshot.forEach((childSnapshot) => {
          const producer = childSnapshot.val();
          if (producer.agentCode === producerData.agentCode) {
            existingProducerId = childSnapshot.key;
          }
        });
      }

      // Update or create producer
      if (existingProducerId) {
        // Update existing producer
        await update(
          ref(database, `producers/${existingProducerId}`),
          producerData
        );
        results.totalProducers++;
      } else {
        // Create new producer
        const newProducerRef = push(ref(database, "producers"));
        const producerId = newProducerRef.key;
        await set(newProducerRef, {
          ...producerData,
          id: producerId,
        });
        existingProducerId = producerId;
        results.totalProducers++;
      }

      // Process licenses for each state
      for (const [stateCode, columnIndex] of Object.entries(stateIndexes)) {
        const licenseStatus = rowData[columnIndex]?.trim();

        // Only process if there's a status
        if (
          licenseStatus &&
          licenseStatus !== "#N/A" &&
          licenseStatus !== "Needs Agents"
        ) {
          // Create a license record
          const licenseData = {
            producerId: existingProducerId,
            producerName: producerData.name,
            state: stateCode,
            licenseNumber: `AUTO-${producerData.agentCode}-${stateCode}`,
            status:
              licenseStatus === "Active"
                ? "active"
                : licenseStatus.toLowerCase(),
            startDate: formattedDate || new Date().toISOString().split("T")[0],
            expirationDate: formattedDate
              ? new Date(
                  new Date(formattedDate).setFullYear(
                    new Date(formattedDate).getFullYear() + 2
                  )
                )
                  .toISOString()
                  .split("T")[0]
              : new Date(new Date().setFullYear(new Date().getFullYear() + 2))
                  .toISOString()
                  .split("T")[0],
            type: "Life and Health",
          };

          // Check if license already exists
          const licensesSnapshot = await get(ref(database, "licenses"));
          let existingLicenseId = null;

          if (licensesSnapshot.exists()) {
            licensesSnapshot.forEach((childSnapshot) => {
              const license = childSnapshot.val();
              if (
                license.producerId === existingProducerId &&
                license.state === stateCode
              ) {
                existingLicenseId = childSnapshot.key;
              }
            });
          }

          // Update or create license
          if (existingLicenseId) {
            // Update existing license
            await update(
              ref(database, `licenses/${existingLicenseId}`),
              licenseData
            );
            results.totalLicenses++;
          } else {
            // Create new license
            const newLicenseRef = push(ref(database, "licenses"));
            const licenseId = newLicenseRef.key;
            await set(newLicenseRef, {
              ...licenseData,
              id: licenseId,
            });
            results.totalLicenses++;
          }
        }
      }
    }

    return results;
  } catch (err) {
    console.error("Data import error:", err);
    return {
      totalProducers: 0,
      totalLicenses: 0,
      errors: [`General import error: ${err.message}`],
    };
  }
};

/**
 * Import producer licenses directly from a CSV/Excel format with columns:
 * Agent Code, Producer Name, NPN, State, License Number, Issue Date, Expiration Date, Status
 */
export const importLicenseData = async (data) => {
  const results = {
    totalLicenses: 0,
    errors: [],
  };

  try {
    // Parse the data
    const rows = data.split("\n").filter((row) => row.trim());

    // Extract header row and validate required columns
    const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());
    const requiredColumns = [
      "agent code",
      "state",
      "license number",
      "expiration date",
    ];

    for (const col of requiredColumns) {
      if (!headers.includes(col)) {
        return {
          totalLicenses: 0,
          errors: [`Missing required column: ${col}`],
        };
      }
    }

    // Find column indexes
    const agentCodeIdx = headers.findIndex((h) => h === "agent code");
    const stateIdx = headers.findIndex((h) => h === "state");
    const licenseNumberIdx = headers.findIndex((h) => h === "license number");
    const issueDateIdx = headers.findIndex((h) => h === "issue date");
    const expirationDateIdx = headers.findIndex((h) => h === "expiration date");
    const statusIdx = headers.findIndex((h) => h === "status");

    // Process each data row
    for (let r = 1; r < rows.length; r++) {
      const rowData = rows[r].split(",");
      if (rowData.length < 4) continue; // Skip incomplete rows

      const agentCode = rowData[agentCodeIdx]?.trim();
      const stateCode = rowData[stateIdx]?.trim();
      const licenseNumber = rowData[licenseNumberIdx]?.trim();
      const expirationDate = rowData[expirationDateIdx]?.trim();

      // Skip if missing required fields
      if (!agentCode || !stateCode || !licenseNumber || !expirationDate) {
        results.errors.push(`Row ${r + 1}: Missing required fields`);
        continue;
      }

      // Find producer by agent code
      const producersSnapshot = await get(ref(database, "producers"));
      let producerId = null;
      let producerName = null;

      if (producersSnapshot.exists()) {
        producersSnapshot.forEach((childSnapshot) => {
          const producer = childSnapshot.val();
          if (producer.agentCode === agentCode) {
            producerId = childSnapshot.key;
            producerName = producer.name;
          }
        });
      }

      if (!producerId) {
        results.errors.push(`Producer not found with agent code: ${agentCode}`);
        continue;
      }

      // Create license data
      const licenseData = {
        producerId,
        producerName,
        state: stateCode,
        licenseNumber: licenseNumber,
        status: calculateLicenseStatus(expirationDate),
        startDate:
          rowData[issueDateIdx]?.trim() ||
          new Date().toISOString().split("T")[0],
        expirationDate: expirationDate,
        type: "Life and Health",
      };

      // Check if license already exists
      const licensesSnapshot = await get(ref(database, "licenses"));
      let existingLicenseId = null;

      if (licensesSnapshot.exists()) {
        licensesSnapshot.forEach((childSnapshot) => {
          const license = childSnapshot.val();
          if (
            license.producerId === producerId &&
            license.state === stateCode
          ) {
            existingLicenseId = childSnapshot.key;
          }
        });
      }

      // Update or create license
      if (existingLicenseId) {
        // Update existing license
        await update(
          ref(database, `licenses/${existingLicenseId}`),
          licenseData
        );
        results.totalLicenses++;
      } else {
        // Create new license
        const newLicenseRef = push(ref(database, "licenses"));
        const licenseId = newLicenseRef.key;
        await set(newLicenseRef, {
          ...licenseData,
          id: licenseId,
        });
        results.totalLicenses++;
      }
    }

    return results;
  } catch (err) {
    console.error("License import error:", err);
    return {
      totalLicenses: 0,
      errors: [`General import error: ${err.message}`],
    };
  }
};

export default {
  importProducerData,
  importLicenseData,
};
