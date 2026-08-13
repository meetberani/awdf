import { useEffect, useState } from "react";
import "./TaskManager.css";

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const API = "http://127.0.0.1:5000/tasks";

  const getId = (taskOrId) => {
    if (!taskOrId) return taskOrId;
    // accept either a task object or a raw id string/number
    if (typeof taskOrId === 'string' || typeof taskOrId === 'number') return taskOrId;
    return taskOrId._id || taskOrId.id;
  };
  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), completed: false }),
      });
      if (!res.ok) throw new Error(`Create failed ${res.status}`);
      const json = await res.json();
      setTasks((t) => [...t, json.task]);
      setTitle("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggle(task) {
    try {
      const id = getId(task);
      const res = await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) throw new Error(`Update failed ${res.status}`);
      const json = await res.json();
      setTasks((list) => list.map((t) => (getId(t) === id ? json.task : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(idOrTask) {
    const id = getId(idOrTask);
    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed ${res.status}`);
      setTasks((list) => list.filter((t) => getId(t) !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(task) {
    setEditingId(getId(task));
    setEditingTitle(task.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }

  async function saveEdit(idOrTask) {
    const id = getId(idOrTask);
    if (!editingTitle.trim()) return alert("Title cannot be empty");
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      if (!res.ok) throw new Error(`Update failed ${res.status}`);
      const json = await res.json();
      setTasks((list) => list.map((t) => (getId(t) === id ? json.task : t)));
      cancelEdit();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="tm-container">
      <h2 className="tm-title">Task Manager</h2>

      <form onSubmit={handleAdd} className="tm-form">
        <input
          className="tm-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title"
        />
        <button className="tm-button" type="submit">Add</button>
      </form>

      {error && <div className="tm-error">Error: {error}</div>}

      {loading ? (
        <div className="tm-loading">Loading...</div>
      ) : (
        <ul className="tm-list">
          {tasks.map((task) => (
            <li key={getId(task)} className={`tm-item ${task.completed ? 'completed' : ''}`}>
              <label className="tm-item-left">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggle(task)}
                />
                <div>
                  {editingId === getId(task) ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                      <button type="button" className="tm-button tm-small" onClick={() => saveEdit(task)}>Save</button>
                      <button type="button" className="tm-button tm-small" onClick={cancelEdit}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="tm-title-text">{task.title}</div>
                        {task.priority ? <div className="tm-priority">{task.priority}</div> : null}
                      </div>
                      <div className="tm-meta">{task.createdAt ? new Date(task.createdAt).toLocaleString() : ''}</div>
                    </>
                  )}
                </div>
              </label>

              <div className="tm-item-actions">
                <button type="button" className="tm-button tm-small" onClick={() => startEdit(task)}>Edit</button>
                <button type="button" className="tm-button tm-small tm-danger" onClick={() => handleDelete(task)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
