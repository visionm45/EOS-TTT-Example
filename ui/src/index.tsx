import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./app";

let root = document.getElementById("root")!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        backgroundColor: "var(--main-fg-color)",
        width: "90vw",
        height: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgba(236, 251, 258, 1)",
          alignContent: "center",
          alignItems: "center",
          width: "90%",
          height: "100vh",
          paddingTop: "50px",
          boxSizing: "border-box",
        }}
      >
        <App />
      </div>
    </div>
  </React.StrictMode>
);
