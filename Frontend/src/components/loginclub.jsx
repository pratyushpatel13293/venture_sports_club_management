import React, { useState, useEffect } from "react";
import { Link, useNavigate,useParams} from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "../utils/axiosInstance";

function Login() {
    const {clubid}=useParams();
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Auto-login if token exists
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const payload = jwtDecode(token);
      if (payload.exp && Date.now() / 1000 < payload.exp) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        navigate("/home", { replace: true });
      } else {
        localStorage.removeItem("accessToken");
        delete axios.defaults.headers.common["Authorization"];
      }
    } catch {
      localStorage.removeItem("accessToken");
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await axiosInstance.post(`/auth/${clubid}/login`, {
        email: formData.emailOrUsername,
        password: formData.password,
      });

      const token = res.data.accessToken;

      if (token) {
        localStorage.setItem("accessToken", token);
        localStorage.setItem("refreshToken", res.data.refreshToken || "");
        localStorage.setItem("user", JSON.stringify(res.data.user || {}));
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      navigate("/home", { replace: true });
    } catch (err) {
      setMessage(err.response?.data?.error || "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
      <div className="bg-gray-900/80 border border-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md backdrop-blur">

        <h1 className="text-3xl font-bold text-center text-indigo-400 mb-1">
          Login
        </h1>

        <p className="text-center text-sm text-gray-400 mb-6">
          Welcome back to <span className="font-semibold text-indigo-300">Venture</span>
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Email / Username
            </label>
            <input
              type="text"
              name="emailOrUsername"
              value={formData.emailOrUsername}
              onChange={handleChange}
              placeholder="Enter your email or username"
              className="w-full mt-1 p-2.5 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full mt-1 p-2.5 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Forgot password link */}
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-indigo-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-lg font-semibold transition-colors"
          >
            Login
          </button>

          {message && (
            <p className="text-center mt-4 text-sm text-red-400">
              {message}
            </p>
          )}
        </form>

        <p className="text-sm text-center mt-6 text-gray-400">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="text-indigo-400 font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
