import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./navbar";
import Login from "./login";
import DataConnect from "./dataconnect";
import Dashboard from "./dashboard";

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/connect-db"
          element={
            <RequireAuth>
              <DataConnect />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
