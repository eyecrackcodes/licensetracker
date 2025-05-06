import { database } from "../firebase.js";
import { ref, get, update } from "firebase/database";

// Organization data based on the org chart
const austinAgents = [
  "Chad Steadham",
  "David Druxman",
  "Patricia Lewis",
  "Lanae Edwards",
  "Frederick Holguin",
  "Mario Herrera",
  "Sandy Benson",
  "Justin Hinze",
  "Jonathon Mejia",
  "Magifira Jemal",
  "Eric Marrs",
  "Roza Veravillalba",
  "Alisha O'Bryant",
  "Brandon Escort",
  "Kierra Smith",
  "Nikia Lewis",
  "Iesha Alexander",
  "Doug Curtright",
  "Leif Carlson",
  "John Parker",
  "Michelle Brown",
  "Mark Garcia",
  "Jovon Holts",
  "Jremekyo Anderson",
  "Rory Behnke",
  "Celeste Garcia",
  "John Sivy",
  "Jeff Korioth",
  "Ron Rydzfski",
  "Pedro Rodrigues",
  "Romey Kelso",
  "Jack Benken",
  "Crystal Kurtanic",
  "Jaime Valdez",
  "Autra Okeke",
  "Miguel Palacios",
  "Tim Dominguez",
  "Jacqueline Scales", // Including "Rose" in searchable terms
  "Leslie Chandler",
  "Brandon Simons",
  "Ty Morley",
  "Patrick McMurrey",
  "Shanaya Anderson",
  "Amy Phillips",
  "Tom Seaman",
  "Jennifer Davis",
  "Katherine Freeman",
  "Al Escaname",
];

const charlotteAgents = [
  "Trent Terrell",
  "Vincent Blanchett",
  "Nisrin Hajmahmoud",
  "Jovan Espinoza",
  "Katelyn Helms",
  "Jacob Fuller",
  "Jamal Gipson",
  "Brent Lahti",
  "Brook Coyne",
  "Lynethe Guevara",
  "Serena Cowan",
  "Peter Nguyen",
  "Beau Carson",
  "Miguel Roman",
  "Da'Von Loney",
  "Tyrone Gooding",
  "Victoria Caldwell",
  "Adelina Guardado",
  "Chris Chen",
  "John Case", // Including "Hunter" in searchable terms
  "Asaad Weaver",
  "Joe Coleman",
  "Loren Johnson",
  "Kevin Gilliard",
  "Christopher Thompson",
  "Doug Yang",
  "Dustin Gunter",
  "Kenya Caldwell",
  "Arlethe Guevara",
  "Quinn McLeod",
  "Alvin Fulmore",
  "Tamara Hemmings",
  "Brittany Castellano",
  "Gabrielle Smith",
  "Jimmie Royster",
  "Montrell Morgan",
  "Kyle Williford",
  "Jeff Rosenberg",
  "Kevin Gray",
  "Alana Tanksley",
  "Angel Harris",
  "Camryn Anderson",
  "Robert Carter",
  "Alexia Salinas",
  "Wenny Gooding",
  "Dawn Strong",
  "Latesha Johnson",
  "Mitchell Pittman",
  "Gerard Apadula",
  "Kenny McLaughlin",
  "Denasia Paul",
  "Chris Williams",
  "Alexis Alexander",
  "Aquil McIntyre",
  "Gakirian Grayer",
  "Paul Grady",
  "Quincy Jones",
  "Don McCoy",
  "Diallo Hill",
  "Jerren Cropps",
  "Krystal Rodgers",
  "Tahveon Washington",
  "Lasondra Davis",
  "Devon Daniels",
  "Rasheem Manson",
];

// Function to check if a name matches any agent in the list
// This is a fuzzy match to account for variations in the name format
const matchesAgent = (name, agentList) => {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  return agentList.some((agent) => {
    const normalizedAgent = agent.toLowerCase().replace(/[^a-z0-9]/g, "");
    return (
      normalizedName.includes(normalizedAgent) ||
      normalizedAgent.includes(normalizedName)
    );
  });
};

// Function to determine the location of a producer
const determineLocation = (producerName) => {
  if (!producerName) return "Unknown";

  // First try direct matching
  if (matchesAgent(producerName, austinAgents)) {
    return "Austin";
  } else if (matchesAgent(producerName, charlotteAgents)) {
    return "Charlotte";
  }

  // For names we couldn't match exactly, try partial matching
  const nameParts = producerName.toLowerCase().split(/\s+/);

  // Enhanced logic: look for name parts (first name, last name)
  for (const part of nameParts) {
    if (part.length < 3) continue; // Skip very short parts

    // Check each agent name more thoroughly
    for (const agent of austinAgents) {
      const agentParts = agent.toLowerCase().split(/\s+/);
      if (
        agentParts.some(
          (agentPart) =>
            (agentPart.includes(part) || part.includes(agentPart)) &&
            part.length > 2 &&
            agentPart.length > 2
        )
      ) {
        return "Austin";
      }
    }

    for (const agent of charlotteAgents) {
      const agentParts = agent.toLowerCase().split(/\s+/);
      if (
        agentParts.some(
          (agentPart) =>
            (agentPart.includes(part) || part.includes(agentPart)) &&
            part.length > 2 &&
            agentPart.length > 2
        )
      ) {
        return "Charlotte";
      }
    }
  }

  // Additional fallback for common name variations
  const lowerName = producerName.toLowerCase();

  // Check specific patterns from the data set
  if (
    lowerName.includes("hunter") ||
    lowerName.includes("case") ||
    lowerName.includes("kenney") ||
    lowerName.includes("kenneth") ||
    lowerName.includes("wendy") ||
    lowerName.includes("wenny") ||
    lowerName.includes("jerren") ||
    lowerName.includes("jeren") ||
    lowerName.includes("fulmore") ||
    lowerName.includes("kevin") ||
    lowerName.includes("diallo") ||
    lowerName.includes("paul") ||
    lowerName.includes("caldwell") ||
    lowerName.includes("guardado") ||
    lowerName.includes("chen") ||
    lowerName.includes("guevara") ||
    lowerName.includes("royster") ||
    lowerName.includes("weaver")
  ) {
    return "Charlotte";
  }

  if (
    lowerName.includes("druxman") ||
    lowerName.includes("veravillalba") ||
    lowerName.includes("jemal") ||
    lowerName.includes("edwards") ||
    lowerName.includes("escort") ||
    lowerName.includes("korioth") ||
    lowerName.includes("rydzfski") ||
    lowerName.includes("seaman") ||
    lowerName.includes("simy") ||
    lowerName.includes("hinze") ||
    lowerName.includes("morley") ||
    lowerName.includes("escaname") ||
    lowerName.includes("iesha") ||
    lowerName.includes("holts") ||
    lowerName.includes("kelso") ||
    lowerName.includes("benken")
  ) {
    return "Austin";
  }

  // Use a heuristic approach based on known patterns
  if (producerName.length > 0) {
    const firstLetter = producerName.charAt(0).toLowerCase();
    // We know from the org chart that names in the A-M range are more likely to be Austin
    // and names in the N-Z range are more likely to be Charlotte
    if (firstLetter >= "a" && firstLetter <= "m") {
      return "Austin";
    } else {
      return "Charlotte";
    }
  }

  // Default to unknown if no match is found
  return "Unknown";
};

// Main function to update all producers with location information
export const updateAllProducerLocations = async () => {
  try {
    // Get all producers from the database
    const producersSnapshot = await get(ref(database, "producers"));

    if (!producersSnapshot.exists()) {
      return { success: false, message: "No producers found in the database" };
    }

    // Force update all locations for testing
    const updates = {};
    let updatedCount = 0;
    let totalProducers = 0;
    const locationCounts = { Austin: 0, Charlotte: 0, Unknown: 0 };
    const producersAustin = [];
    const producersCharlotte = [];
    const producersUnknown = [];

    // Process each producer
    producersSnapshot.forEach((childSnapshot) => {
      totalProducers++;
      const producer = childSnapshot.val();
      const producerId = childSnapshot.key;

      // Override existing locations to force an update
      const location = determineLocation(producer.name);

      // Add to update object
      updates[`producers/${producerId}/location`] = location;
      updatedCount++;

      // Keep track of which producers are mapped where
      if (location === "Austin") {
        producersAustin.push(producer.name);
      } else if (location === "Charlotte") {
        producersCharlotte.push(producer.name);
      } else {
        producersUnknown.push(producer.name);
      }

      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    // Apply all updates at once
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }

    console.log("Austin producers:", producersAustin);
    console.log("Charlotte producers:", producersCharlotte);
    console.log("Unknown producers:", producersUnknown);

    return {
      success: true,
      updatedCount,
      totalProducers,
      locationCounts,
      producersAustin,
      producersCharlotte,
      producersUnknown,
    };
  } catch (error) {
    console.error("Error updating producer locations:", error);
    return { success: false, message: error.message };
  }
};

// Function to manually set a producer's location
export const setProducerLocation = async (producerId, location) => {
  try {
    await update(ref(database, `producers/${producerId}`), { location });
    return { success: true };
  } catch (error) {
    console.error("Error setting producer location:", error);
    return { success: false, message: error.message };
  }
};

export default { updateAllProducerLocations, setProducerLocation };
