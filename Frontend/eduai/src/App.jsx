import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Auth from "./components/Login/Auth";
import FileUpload from "./components/FileUpload/FileUpload";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Login / Signup Page */}
        <Route path="/login" element={<Auth />} />

        <Route path="/fileupload" element={<FileUpload />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    </Router>
  );
}
