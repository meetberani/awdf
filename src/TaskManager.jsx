import { useEffect, useState } from "react";
import { createTask, deleteTask, getTasks, updateTask } from "./api";
import "./TaskManager.css";

function getId(task) {
  return task?._id || task?.id;
}

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      setTasks(await getTasks());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleAdd(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Title is required");
      return;
    }

    const temporaryId = `temporary-${Date.now()}`;
    const optimisticTask = { id: temporaryId, title: cleanTitle, completed: false };
    setTasks((current) => [...current, optimisticTask]);
    setTitle("");
    setError("");
    setBusyId(temporaryId);

    try {
      const result = await createTask({ title: cleanTitle, completed: false });
      setTasks((current) => current.map((task) => (getId(task) === temporaryId ? result.task : task)));
      showNotice("Task created successfully");
    } catch (err) {
      setTasks((current) => current.filter((task) => getId(task) !== temporaryId));
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(task) {
    const id = getId(task);
    setBusyId(id);
    setError("");
    try {
      const result = await updateTask(id, { completed: !task.completed });
      setTasks((current) => current.map((item) => (getId(item) === id ? result.task : item)));
      showNotice("Task updated successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;

    const id = getId(task);
    setBusyId(id);
    setError("");
    try {
      await deleteTask(id);
      setTasks((current) => current.filter((item) => getId(item) !== id));
      showNotice("Task deleted successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(task) {
    setEditingId(getId(task));
    setEditingTitle(task.title);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }

  async function saveEdit(task) {
    const cleanTitle = editingTitle.trim();
    if (!cleanTitle) {
      setError("Title cannot be empty");
      return;
    }

    const id = getId(task);
    setBusyId(id);
    setError("");
    try {
      const result = await updateTask(id, { title: cleanTitle });
      setTasks((current) => current.map((item) => (getId(item) === id ? result.task : item)));
      cancelEdit();
      showNotice("Task updated successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="tm-container">
      <div className="tm-heading">
        <div>
          <p className="tm-kicker">FULL-STACK WORKSPACE</p>
          <h2 className="tm-title">Task Manager</h2>
        </div>
        <span className="tm-count">{tasks.length} tasks</span>
      </div>

      <form onSubmit={handleAdd} className="tm-form">
        <input
          className="tm-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          aria-label="New task title"
        />
        <button className="tm-button" type="submit" disabled={busyId?.startsWith("temporary-")}>Add task</button>
      </form>

      {notice && <div className="tm-toast" role="status">{notice}</div>}
      {error && <div className="tm-error" role="alert">{error}</div>}

      {loading ? (
        <div className="tm-loading">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="tm-empty">No tasks yet. Add your first one above.</div>
      ) : (
        <ul className="tm-list">
          {tasks.map((task) => {
            const id = getId(task);
            const isBusy = busyId === id;
            return (
              <li key={id} className={`tm-item ${task.completed ? "completed" : ""}`}>
                <label className="tm-item-left">
                  <input type="checkbox" checked={task.completed} onChange={() => handleToggle(task)} disabled={isBusy} />
                  <div className="tm-task-content">
                    {editingId === id ? (
                      <div className="tm-edit-row">
                        <input className="tm-edit-input" value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} autoFocus />
                        <button type="button" className="tm-button tm-small" onClick={() => saveEdit(task)} disabled={isBusy}>Save</button>
                        <button type="button" className="tm-button tm-small tm-muted" onClick={cancelEdit}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div className="tm-title-text">{task.title}</div>
                        <div className="tm-meta">{task.createdAt ? new Date(task.createdAt).toLocaleString() : "Pending save..."}</div>
                      </>
                    )}
                  </div>
                </label>
                <div className="tm-item-actions">
                  <button type="button" className="tm-button tm-small tm-muted" onClick={() => startEdit(task)} disabled={isBusy}>Edit</button>
                  <button type="button" className="tm-button tm-small tm-danger" onClick={() => handleDelete(task)} disabled={isBusy}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
