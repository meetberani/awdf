import { useEffect, useState } from "react";
import { createTask, deleteTask, generateAiDescription, getTasks, updateTask } from "./api";
import "./TaskManager.css";

function getId(task) {
  return task?._id || task?.id;
}

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  // AI Feature States (Practical 13)
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiDisclaimer, setAiDisclaimer] = useState("");
  const [aiCooldown, setAiCooldown] = useState(0);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
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

  async function handleAiGenerate() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Please enter a task title first before generating an AI description.");
      return;
    }

    setError("");
    setIsAiGenerating(true);

    try {
      const res = await generateAiDescription(cleanTitle);
      if (res.description) {
        setDescription(res.description);
        setAiDisclaimer(res.disclaimer || "AI-generated suggestion. Please review and modify before saving.");
        showNotice(res.fallback ? "✨ Contextual description generated (Fallback mode)" : `✨ AI description generated via ${res.provider || 'AI'}!`);
      }

      // Start 5-second cooldown (Rate Limiting requirement)
      setAiCooldown(5);
      const timer = window.setInterval(() => {
        setAiCooldown((prev) => {
          if (prev <= 1) {
            window.clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to generate AI description");
    } finally {
      setIsAiGenerating(false);
    }
  }

  async function handleAdd(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Title is required");
      return;
    }

    const cleanDescription = description.trim();
    const temporaryId = `temporary-${Date.now()}`;
    const optimisticTask = { id: temporaryId, title: cleanTitle, description: cleanDescription, completed: false };
    setTasks((current) => [...current, optimisticTask]);
    setTitle("");
    setDescription("");
    setAiDisclaimer("");
    setError("");
    setBusyId(temporaryId);

    try {
      const result = await createTask({
        title: cleanTitle,
        description: cleanDescription,
        completed: false
      });
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
          <p className="tm-kicker">FULL-STACK WORKSPACE • AI POWERED</p>
          <h2 className="tm-title">Task Manager</h2>
        </div>
        <span className="tm-count">{tasks.length} tasks</span>
      </div>

      <form onSubmit={handleAdd} className="tm-form-box">
        <div className="tm-form-row">
          <input
            className="tm-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title (e.g., Deploy to AWS, Study for Viva)..."
            aria-label="New task title"
          />
          <button
            type="button"
            className="tm-ai-btn"
            onClick={handleAiGenerate}
            disabled={isAiGenerating || aiCooldown > 0 || !title.trim()}
            title="Auto-generate description using AI"
          >
            {isAiGenerating ? "⏳ Generating..." : aiCooldown > 0 ? `⏳ Cooldown (${aiCooldown}s)` : "✨ Auto-Generate with AI"}
          </button>
          <button className="tm-button" type="submit" disabled={busyId?.startsWith("temporary-")}>
            Add task
          </button>
        </div>

        {/* Editable description suggestion (Practical 13 requirement) */}
        <div className="tm-desc-wrapper">
          <textarea
            className="tm-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Task description (type manually or click '✨ Auto-Generate with AI' above to draft)..."
            rows={2}
          />
          {aiDisclaimer && (
            <div className="tm-ai-disclaimer" role="note">
              <span className="tm-ai-sparkle">🤖</span> {aiDisclaimer}
            </div>
          )}
        </div>
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
                        {task.description && <div className="tm-desc-text">{task.description}</div>}
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
