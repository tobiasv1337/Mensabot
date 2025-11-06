import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

   {/* so kann es gestartet werden npm create vite@latest mensabot-react --template react*/}

ReactDOM.createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
