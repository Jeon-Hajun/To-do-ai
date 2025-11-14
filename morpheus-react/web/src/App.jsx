import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes";
import { AuthProvider, useAuthContext } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutesWrapper />
      </Router>
    </AuthProvider>
  );
}

function AppRoutesWrapper() {
  const { user } = useAuthContext();

  return <AppRoutes user={user} />;
}

export default App;
