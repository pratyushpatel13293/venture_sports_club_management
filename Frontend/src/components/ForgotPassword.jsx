import React, { useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // STEP 1 — SEND OTP
  const sendOtp = async () => {
    if (!email) {
      setMessage("Please enter your email");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await axiosInstance.post("/auth/forgot-password", { email });

      setStep(2);
      setMessage("OTP sent to your email");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 — VERIFY OTP
  const verifyOtp = async () => {
    if (!otp) {
      setMessage("Please enter OTP");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await axiosInstance.post("/auth/verify-forgot-otp", {
        email,
        otp,
      });

      setStep(3);
      setMessage("OTP verified. Set your new password.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 — RESET PASSWORD
  const resetPassword = async () => {
    if (!password) {
      setMessage("Please enter a new password");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await axiosInstance.post("/auth/reset-password", {
        email,
        newPassword: password,
      });

      setMessage("Password updated successfully");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setMessage(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
      <div className="bg-gray-900/80 border border-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md backdrop-blur">

        <h1 className="text-3xl font-bold text-center text-indigo-400 mb-1">
          Forgot Password
        </h1>

        <p className="text-center text-sm text-gray-400 mb-6">
          Reset your password securely
        </p>

        {/* STEP 1: EMAIL */}
        {step === 1 && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full mt-1 p-2.5 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={sendOtp}
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300">
                Enter OTP
              </label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                className="w-full mt-1 p-2.5 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </>
        )}

        {/* STEP 3: RESET PASSWORD */}
        {step === 3 && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full mt-1 p-2.5 bg-gray-950 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={resetPassword}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-semibold"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}

        {message && (
          <p className="text-center mt-4 text-sm text-red-400">
            {message}
          </p>
        )}

        <p className="text-center mt-6 text-sm text-gray-400">
          Remember your password?{" "}
          <span
            onClick={() => navigate("/")}
            className="text-indigo-400 cursor-pointer hover:underline"
          >
            Go back to login
          </span>
        </p>
      </div>
    </div>
  );
}
