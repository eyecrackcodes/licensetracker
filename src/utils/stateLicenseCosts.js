// State license costs data
export const stateLicenseCosts = [
  { state: "AL", name: "Alabama", fee: 80 },
  { state: "AK", name: "Alaska", fee: 75 },
  { state: "AZ", name: "Arizona", fee: 120 },
  { state: "AR", name: "Arkansas", fee: 70 },
  { state: "CA", name: "California", fee: 188 },
  { state: "CO", name: "Colorado", fee: 71 },
  { state: "CT", name: "Connecticut", fee: 140 },
  { state: "DE", name: "Delaware", fee: 100 },
  { state: "DC", name: "District of Columbia", fee: 100 },
  { state: "FL", name: "Florida", fee: 55 },
  { state: "GA", name: "Georgia", fee: 120 },
  { state: "HI", name: "Hawaii", fee: 225 },
  { state: "ID", name: "Idaho", fee: 80 },
  { state: "IL", name: "Illinois", fee: 359 },
  { state: "IN", name: "Indiana", fee: 90 },
  { state: "IA", name: "Iowa", fee: 50 },
  { state: "KS", name: "Kansas", fee: 50 },
  { state: "KY", name: "Kentucky", fee: 100 },
  { state: "LA", name: "Louisiana", fee: 75 },
  { state: "ME", name: "Maine", fee: 55 },
  { state: "MD", name: "Maryland", fee: 54 },
  { state: "MA", name: "Massachusetts", fee: 225 },
  { state: "MI", name: "Michigan", fee: 10 },
  { state: "MN", name: "Minnesota", fee: 60 },
  { state: "MS", name: "Mississippi", fee: 100 },
  { state: "MO", name: "Missouri", fee: 100 },
  { state: "MT", name: "Montana", fee: 100 },
  { state: "NE", name: "Nebraska", fee: 50 },
  { state: "NV", name: "Nevada", fee: 185 },
  { state: "NH", name: "New Hampshire", fee: 210 },
  { state: "NJ", name: "New Jersey", fee: 170 },
  { state: "NM", name: "New Mexico", fee: 30 },
  { state: "NY", name: "New York", fee: 40 },
  { state: "NC", name: "North Carolina", fee: 50 },
  { state: "ND", name: "North Dakota", fee: 100 },
  { state: "OH", name: "Ohio", fee: 10 },
  { state: "OK", name: "Oklahoma", fee: 100 },
  { state: "OR", name: "Oregon", fee: 75 },
  { state: "PA", name: "Pennsylvania", fee: 110 },
  { state: "RI", name: "Rhode Island", fee: 130 },
  { state: "SC", name: "South Carolina", fee: 25 },
  { state: "SD", name: "South Dakota", fee: 30 },
  { state: "TN", name: "Tennessee", fee: 50 },
  { state: "TX", name: "Texas", fee: 50 },
  { state: "UT", name: "Utah", fee: 75 },
  { state: "VT", name: "Vermont", fee: 30 },
  { state: "VA", name: "Virginia", fee: 15 },
  { state: "WA", name: "Washington", fee: 55 },
  { state: "WV", name: "West Virginia", fee: 50 },
  { state: "WI", name: "Wisconsin", fee: 75 },
  { state: "WY", name: "Wyoming", fee: 150 },
];

// Common license types
export const licenseTypes = [
  { value: "Life", label: "Life" },
  { value: "Health", label: "Health" },
  { value: "P&C", label: "Property & Casualty" },
  { value: "Life & Health", label: "Life & Health" },
  { value: "Variable", label: "Variable" },
  { value: "L&H and Variable", label: "Life, Health & Variable" },
  { value: "Broker", label: "Broker" },
  { value: "Adjuster", label: "Adjuster" },
];

// Helper function to get fee by state code
export const getLicenseFee = (stateCode) => {
  const state = stateLicenseCosts.find(
    (s) => s.state === stateCode.toUpperCase()
  );
  return state ? state.fee : 0;
};
