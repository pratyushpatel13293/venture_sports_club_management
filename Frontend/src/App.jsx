import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/login.jsx";
import Signup from "./components/Signup";
import ForgotPassword from "./components/ForgotPassword";

import Home from "./components/home.jsx";
import EventsDashboard from "./components/event";
import EventPage from "./components/eventpage";
import Schedule from "./components/schedule";
import Layout from "./components/Layout";
import ClubChat from "./components/ClubChat";
import TeamManage from "./components/teammanage";
import Loginclub from "./components/loginclub.jsx";
import Signupclub from "./components/signupclub.jsx";
import EventQueries from "./components/EventQueries";
import AdminEventQueries from "./components/AdminEventQueries";
import Edit from "./components/editevent.jsx";
import Profile from "./components/profile";
import EventBracket from "./components/EventBracket";
import EventMatches from "./components/EventMatches";
import MatchControl from "./components/MatchControl";
import EventWinner from "./components/EventWinner";
import LiveMatchView from "./components/LiveMatchView.jsx";

import { ThemeProvider } from "./utils/theme.jsx";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  if (!token && !refreshToken) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/events/:clubid/login" element={<Loginclub />} />
        <Route path="/events/:clubid/signup" element={<Signupclub />} />

        {/* PROTECTED ROUTES */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Layout><Home /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout><Profile /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid"
          element={
            <ProtectedRoute>
              <Layout><EventsDashboard /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId"
          element={
            <ProtectedRoute>
              <Layout><EventPage /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/edit"
          element={
            <ProtectedRoute>
              <Layout><Edit /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/team/:teamid"
          element={
            <ProtectedRoute>
              <Layout><TeamManage /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/:scheduleid"
          element={
            <ProtectedRoute>
              <Layout><Schedule /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/query"
          element={
            <ProtectedRoute>
              <Layout><EventQueries /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/queries/admin"
          element={
            <ProtectedRoute>
              <Layout><AdminEventQueries /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/bracket"
          element={
            <ProtectedRoute>
              <Layout><EventBracket /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/matches"
          element={
            <ProtectedRoute>
              <Layout><EventMatches /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/winner"
          element={
            <ProtectedRoute>
              <Layout><EventWinner /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/matches/:matchId"
          element={
            <ProtectedRoute>
              <Layout><MatchControl /></Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:clubid/:eventId/matches/:matchId/live"
          element={
            <ProtectedRoute>
              <Layout><LiveMatchView /></Layout>
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </ThemeProvider>
  );
}
