// src/routes/ProtectedRoutes.jsx
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>; // 서버 확인 중

  if (!user) return <Navigate to="/login" />;

  return children;
}

export function UserProtectedRoute({ user, allowedUserIds = [], children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedUserIds.includes(user.id)) return <Navigate to="/unauthorized" replace />;
  return children;
}

export function RoleProtectedRoute({ user, allowedRoles = [], children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

export default function PrivateRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>; // 혹은 스켈레톤 UI
  if (!user) return <Navigate to="/login" />;

  return children;
}
