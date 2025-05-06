import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import "./styles.css"; // Import our new styles
import App from "./App.tsx"; // Update path to include .tsx extension

// Render the app
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

// Remove reportWebVitals since it's not available
