import { useEffect, useState } from "react";
import Student from "./student";
import { Navigate, Routes, Route } from "react-router-dom";
import Project from "./Projects";
import NavBar from "./NavBar";
import Contact from "./Contact";
import TaskManager from "./TaskManager";
import Auth from "./Auth";

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("task-manager-token");
    return token ? { email: "Signed in" } : null;
  });

  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("auth-expired", expire);
    return () => window.removeEventListener("auth-expired", expire);
  }, []);

  function logout() {
    localStorage.removeItem("task-manager-token");
    setUser(null);
  }

  return (
    <>
      <NavBar user={user} onLogout={logout} />

      <Routes>
        <Route path="/" element={<Student />} />
        <Route path="/project" element={<Project />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Auth onAuthenticated={setUser} />} />
        <Route path="/tasks" element={user ? <TaskManager /> : <Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App
