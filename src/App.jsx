import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import Student from "./student";
import { Link, Routes, Route } from "react-router-dom";
import Project from "./Projects";
import NavBar from "./NavBar";
import Contact from "./Contact";
import TaskManager from "./TaskManager";

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
           <NavBar />

      <Routes>
        <Route path="/" element={<Student />} />
        <Route path="/project" element={<Project />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/tasks" element={<TaskManager />} />
      </Routes>
    

    
    </>
  )
}

export default App
