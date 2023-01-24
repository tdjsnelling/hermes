import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HermesProvider } from "@hermes/react";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <HermesProvider url="ws://localhost:9000">
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </HermesProvider>
);
