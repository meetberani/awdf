
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Task = require('./models/Task');

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

app.use((req, res, next) => {
    if ((req.method === 'POST' || req.method === 'PUT') && !req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
    next();
});

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskmanager';

mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err.message));

const validateTaskId = (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid task ID format' });
    }
    next();
};

// ===============================
// GET - Get all tasks
// ===============================
app.get('/tasks', async (req, res, next) => {
    try {
        const all = await Task.find().sort({ createdAt: 1 }).lean();
        res.status(200).json(all);
    } catch (err) {
        next(err);
    }
});

// ===============================
// GET - Get task by ID
// ===============================
app.get('/tasks/:id', validateTaskId, async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id).lean();
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.status(200).json(task);
    } catch (err) {
        next(err);
    }
});

// ===============================
// POST - Create new task
// ===============================
app.post('/tasks', async (req, res, next) => {
    try {
        const { title, completed } = req.body;
        if (!title || typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }
        const created = await Task.create({ title: title.trim(), completed: Boolean(completed) });
        res.status(201).json({ message: 'Task created successfully', task: created });
    } catch (err) {
        next(err);
    }
});

// ===============================
// PUT - Update task
// ===============================
app.put('/tasks/:id', validateTaskId, async (req, res, next) => {
    try {
        const updates = {};
        const { title, completed } = req.body;
        if (title !== undefined) {
            if (typeof title !== 'string' || title.trim() === '') return res.status(400).json({ error: 'Title must be a non-empty string' });
            updates.title = title.trim();
        }
        if (completed !== undefined) updates.completed = Boolean(completed);

        const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
        if (!updated) return res.status(404).json({ error: 'Task not found' });
        res.status(200).json({ message: 'Task updated successfully', task: updated });
    } catch (err) {
        next(err);
    }
});

// ===============================
// DELETE - Delete task
// ===============================
app.delete('/tasks/:id', validateTaskId, async (req, res, next) => {
    try {
        const deleted = await Task.findByIdAndDelete(req.params.id).lean();
        if (!deleted) return res.status(404).json({ error: 'Task not found' });
        res.status(200).json({ message: 'Task deleted successfully', task: deleted });
    } catch (err) {
        next(err);
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Structured error handler
app.use((err, req, res, next) => {
    console.error(err);
    if (err.name === 'ValidationError') {
        const errors = Object.keys(err.errors).reduce((acc, key) => {
            acc[key] = err.errors[key].message;
            return acc;
        }, {});
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid ID format' });
    }
    res.status(err.status || 500).json({ error: err.message || 'Something went wrong' });
});

const port = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;

