import React, { useState, useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import AppRoutes from "./routes";
import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme, parseThemeName } from "./theme";
import { Layout } from "./components/layout/index.js";

const queryClient = new QueryClient();

function AppContent() {
  console.log('[AppContent] 렌더링 시작');
  
  try {
    const { user } = useAuthContext();
    console.log('[AppContent] user:', user);
    
    const location = useLocation();
    console.log('[AppContent] location:', location.pathname);
    
    const [themeName, setThemeName] = useState(() => {
      const theme = localStorage.getItem("theme") || "light-green";
      console.log('[AppContent] 초기 테마:', theme);
      return theme;
    });
    const [theme, setTheme] = useState(() => {
      const { mode, color } = parseThemeName(themeName);
      const createdTheme = createAppTheme(mode, color);
      console.log('[AppContent] 테마 생성 완료:', { mode, color });
      return createdTheme;
    });

    // 테마 변경 감지 (다른 탭에서 변경된 경우)
    useEffect(() => {
      console.log('[AppContent] 테마 변경 감지 useEffect 등록');
      const handleStorageChange = (e) => {
        if (e.key === "theme") {
          const newThemeName = e.newValue || "light-green";
          console.log('[AppContent] 테마 변경 감지:', newThemeName);
          setThemeName(newThemeName);
          const { mode, color } = parseThemeName(newThemeName);
          setTheme(createAppTheme(mode, color));
        }
      };

      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    // 테마 변경 함수를 window에 등록 (SettingsPage에서 사용)
    useEffect(() => {
      console.log('[AppContent] window.changeTheme 등록');
      window.changeTheme = (newThemeName) => {
        localStorage.setItem("theme", newThemeName);
        setThemeName(newThemeName);
        const { mode, color } = parseThemeName(newThemeName);
        setTheme(createAppTheme(mode, color));
      };
      return () => {
        delete window.changeTheme;
      };
    }, []);

    // Login/Signup 페이지는 Layout 없이 표시
    const noLayoutPaths = ['/login', '/signup'];
    const shouldUseLayout = !noLayoutPaths.includes(location.pathname);
    console.log('[AppContent] shouldUseLayout:', shouldUseLayout);

    console.log('[AppContent] 렌더링 완료, ThemeProvider 반환');
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {shouldUseLayout ? (
          <Layout>
            <AppRoutes user={user} />
          </Layout>
        ) : (
          <AppRoutes user={user} />
        )}
      </ThemeProvider>
    );
  } catch (error) {
    console.error('[AppContent] 에러 발생:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>에러 발생</h1>
        <pre>{error.toString()}</pre>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}

function App() {
  console.log('[App] 렌더링 시작');
  
  try {
    console.log('[App] BrowserRouter 생성');
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    );
  } catch (error) {
    console.error('[App] 에러 발생:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>App 에러 발생</h1>
        <pre>{error.toString()}</pre>
        <pre>{error.stack}</pre>
      </div>
    );
  }
}

export default App;
