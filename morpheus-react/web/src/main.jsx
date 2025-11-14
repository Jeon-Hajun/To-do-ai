// src/main.jsx
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme } from "./theme";
import "./index.css";

const queryClient = new QueryClient();

function AppWithTheme() {
  const [themeName, setThemeName] = useState(() => {
    // localStorage에서 테마 불러오기
    return localStorage.getItem("theme") || "light";
  });
  const [theme, setTheme] = useState(() => createAppTheme(themeName));

  // 테마 변경 감지 (다른 탭에서 변경된 경우)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "theme") {
        const newThemeName = e.newValue || "light";
        setThemeName(newThemeName);
        setTheme(createAppTheme(newThemeName));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 테마 변경 함수를 window에 등록 (SettingsPage에서 사용)
  useEffect(() => {
    window.changeTheme = (newThemeName) => {
      localStorage.setItem("theme", newThemeName);
      setThemeName(newThemeName);
      setTheme(createAppTheme(newThemeName));
    };
    return () => {
      delete window.changeTheme;
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppWithTheme />
  </React.StrictMode>
);