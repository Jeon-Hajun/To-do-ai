// src/routes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AdminPage from "./pages/AdminPage";
import ManagerPage from "./pages/ManagerPage";
import Login from "./pages/Login";
import SignupPage from "./pages/SignupPage";
import ProjectPage from "./pages/ProjectPage";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import TaskListPage from "./pages/TaskListPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import AIadvisorPage from "./pages/AIadvisorPage";
import AINextStepPage from "./pages/AINextStepPage";
import SettingsPage from "./pages/SettingsPage";


import {
  ProtectedRoute,
  UserProtectedRoute,
  RoleProtectedRoute
} from "./routes/ProtectedRoutes";
import { Navigate } from "react-router-dom";

export default function AppRoutes({ user }) {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />
        } 
      />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } 
      />
      <Route path="/about" element={<About />} />
      <Route
        path="/aiadvisor"
        element={
          <ProtectedRoute>
            <AIadvisorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-next-step"
        element={
          <ProtectedRoute>
            <AINextStepPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <UserProtectedRoute user={user} allowedUserIds={[1]}>
            <AdminPage />
          </UserProtectedRoute>
        }
      />

      <Route
        path="/manager"
        element={
          <RoleProtectedRoute user={user} allowedRoles={["manager", "admin"]}>
            <ManagerPage />
          </RoleProtectedRoute>
        }
      />
      <Route
  path="/projects"
  element={
    <ProtectedRoute>
      <ProjectPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/projects/:projectId/tasks/:taskId"
  element={
    <ProtectedRoute>
      <TaskDetailPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/projects/:projectId/tasks"
  element={
    <ProtectedRoute>
      <TaskListPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/projects/:projectId"
  element={
    <ProtectedRoute>
      <ProjectDetailPage />
    </ProtectedRoute>
  }
/>

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
