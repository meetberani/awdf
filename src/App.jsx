import { lazy, Suspense, useEffect, useState } from "react";
import Student from "./student";
import { Navigate, Routes, Route } from "react-router-dom";
import NavBar from "./NavBar";
import Auth from "./Auth";

const Project = lazy(() => import("./Projects"));
const Contact = lazy(() => import("./Contact"));
const TaskManager = lazy(() => import("./TaskManager"));

function PageLoading() {
  return (
    <div role="status" style={{ padding: "2rem", textAlign: "center" }}>
      Loading page...
    </div>
  );
}

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

      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Student />} />
          <Route path="/project" element={<Project />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Auth onAuthenticated={setUser} />} />
          <Route path="/tasks" element={user ? <TaskManager /> : <Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App
