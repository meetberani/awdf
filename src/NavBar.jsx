import { NavLink } from "react-router-dom";

function NavBar({ user, onLogout }) {
  return (
    <nav>
      <NavLink to="/">Home</NavLink> |{" "}
      <NavLink to="/project">Project</NavLink> |{" "}
      <NavLink to="/contact">Contact</NavLink> |{" "}
      <NavLink to="/tasks">Tasks</NavLink>{" "}
      {user ? <button type="button" onClick={onLogout}>Log out</button> : <NavLink to="/login">Log in</NavLink>}
    </nav>
  );
}

export default NavBar;