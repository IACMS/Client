import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext";
import { NotificationProvider } from "./context/NotificationContext";
import App from "./App";
import "./i18n";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
