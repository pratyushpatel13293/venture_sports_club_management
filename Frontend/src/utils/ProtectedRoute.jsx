import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";

export default function ProtectedRoute() {
  const [isAuth, setIsAuth] = useState(null); // null = loading

  useEffect(() => {
    axiosInstance
      .get("/auth/me")
      .then(() => setIsAuth(true))
      .catch(() => setIsAuth(false));
  }, []);

  // ⏳ while checking auth
  if (isAuth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Checking session...
      </div>
    );
  }

  // ❌ not authenticated
  if (!isAuth) {
    return <Navigate to="/" replace />;
  }

  // ✅ authenticated
  return <Outlet />;
}
