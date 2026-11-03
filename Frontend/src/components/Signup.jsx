import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "../utils/axiosInstance";

function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    roll_number: "",
    gender: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* -----------------------------------------------------------
     AUTO LOGIN IF TOKEN EXISTS
  ----------------------------------------------------------- */
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

  /* -----------------------------------------------------------
     SIGNUP (NO OTP)
  ----------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      setLoading(true);

      const res = await axiosInstance.post("/auth/signup", {
        username: formData.username,
        name: formData.name,
        roll_number: formData.roll_number,
        gender: formData.gender,
        email: formData.email,
        password: formData.password,
      });

      const { accessToken, refreshToken, user } = res.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

      navigate("/home", { replace: true });
    } catch (err) {
      setMessage(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
      <div className="bg-gray-900/80 border border-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md backdrop-blur">
        <h1 className="text-3xl font-bold text-center text-indigo-400 mb-1">
          Create Account
        </h1>

        <p className="text-center text-sm text-gray-400 mb-6">
          Join <span className="font-semibold text-indigo-300">Venture</span>
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username"
            className="w-full p-2.5 bg-gray-950 border border-gray-700 rounded-lg"
            required
          />

          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full p-2.5 bg-gray-950 border border-gray-700 rounded-lg"
            required
          />

          <input
            name="roll_number"
            value={formData.roll_number}
            onChange={handleChange}
            placeholder="Roll Number"
            className="w-full p-2.5 bg-gray-950 border border-gray-700 rounded-lg"
          />

          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full p-2.5 bg-gray-950 border border-gray-700 rounded-lg"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full p-2.5 bg-gray-950 border border-gray-700 rounded-lg"
            required
          />

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full p-2.5 bg-gray-950 border border-gray-700 rounded-lg"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-lg font-semibold"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {message && (
          <p className="text-center mt-4 text-sm text-red-400">{message}</p>
        )}

        <p className="text-sm text-center mt-6 text-gray-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-400 font-semibold hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
