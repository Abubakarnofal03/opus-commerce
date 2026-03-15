import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isCapacitor } from "./lib/capacitor.ts";

// Apply mobile-specific CSS class when running inside Capacitor native shell
if (isCapacitor()) {
  document.body.classList.add('is-capacitor');
}

createRoot(document.getElementById("root")!).render(<App />);

