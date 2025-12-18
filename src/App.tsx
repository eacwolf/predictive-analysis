import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./navbar";
import Login from "./login";
import DataConnect from "./dataconnect";
import Dashboard from "./dashboard";

const App = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/connect-db" element={<DataConnect />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
