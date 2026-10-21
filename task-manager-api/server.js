
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');
const Task = require('./models/Task');
const User = require('./models/User');
const taskEvents = require('./events');
require('./listeners');

const app = express();
const cacheTtl = Number.parseInt(process.env.TASK_CACHE_TTL_SECONDS || '60', 10);
const cache = new NodeCache({ stdTTL: Number.isFinite(cacheTtl) && cacheTtl > 0 ? cacheTtl : 60 });
const cacheEnabled = process.env.TASK_CACHE_ENABLED !== 'false';
const cacheStats = { hits: 0, misses: 0 };

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
const jwtSecret = process.env.JWT_SECRET;

mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err.message));

const validateTaskId = (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid task ID format' });
    }
    next();
};

const requireAuth = (req, res, next) => {
    if (!jwtSecret) return res.status(500).json({ error: 'JWT_SECRET is not configured' });

    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Authorization token is required' });
    }

    try {
        req.user = jwt.verify(token, jwtSecret);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const validateCredentials = (req, res, next) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: 'Email is required' });
    }
    if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    req.credentials = { email: email.trim().toLowerCase(), password };
    next();
};

const publicUser = (user) => ({ id: user._id, email: user.email });

const createToken = (user) => jwt.sign({ id: user._id.toString(), email: user.email }, jwtSecret, { expiresIn: '1h' });

app.post('/auth/register', validateCredentials, async (req, res, next) => {
    try {
        if (!jwtSecret) return res.status(500).json({ error: 'JWT_SECRET is not configured' });
        const existingUser = await User.findOne({ email: req.credentials.email });
        if (existingUser) return res.status(409).json({ error: 'An account with that email already exists' });

        const password = await bcrypt.hash(req.credentials.password, 10);
        const user = await User.create({ email: req.credentials.email, password });
        res.status(201).json({ user: publicUser(user), token: createToken(user) });
    } catch (err) {
        next(err);
    }
});

app.post('/auth/login', validateCredentials, async (req, res, next) => {
    try {
        if (!jwtSecret) return res.status(500).json({ error: 'JWT_SECRET is not configured' });
        const user = await User.findOne({ email: req.credentials.email }).select('+password');
        const isMatch = user && await bcrypt.compare(req.credentials.password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });
        res.status(200).json({ user: publicUser(user), token: createToken(user) });
    } catch (err) {
        next(err);
    }
});

app.get('/me', requireAuth, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).lean();
        if (!user) return res.status(401).json({ error: 'User account no longer exists' });
        res.status(200).json({ user: publicUser(user) });
    } catch (err) {
        next(err);
    }
});

// ===============================
// GET - Get all tasks
// ===============================
app.get('/tasks', requireAuth, async (req, res, next) => {
    try {
        const cachedTasks = cacheEnabled && cache.get('all_tasks');
        if (cachedTasks) {
            cacheStats.hits += 1;
            return res.status(200).json(cachedTasks);
        }
        cacheStats.misses += 1;
        const all = await Task.find().sort({ createdAt: 1 }).lean();
        if (cacheEnabled) cache.set('all_tasks', all);
        res.status(200).json(all);
    } catch (err) {
        next(err);
    }
});

// ===============================
// GET - Get task by ID
// ===============================
app.get('/tasks/:id', requireAuth, validateTaskId, async (req, res, next) => {
    try {
        const cacheKey = `task:${req.params.id}`;
        const cachedTask = cacheEnabled && cache.get(cacheKey);
        if (cachedTask) {
            cacheStats.hits += 1;
            return res.status(200).json(cachedTask);
        }
        cacheStats.misses += 1;
        const task = await Task.findById(req.params.id).lean();
        if (!task) return res.status(404).json({ error: 'Task not found' });
        if (cacheEnabled) cache.set(cacheKey, task);
        res.status(200).json(task);
    } catch (err) {
        next(err);
    }
});

// ===============================
// POST - Create new task
// ===============================
app.post('/tasks', requireAuth, async (req, res, next) => {
    try {
        const { title, completed } = req.body;
        if (!title || typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }
        const created = await Task.create({ title: title.trim(), completed: Boolean(completed) });
        cache.del('all_tasks');
        res.status(201).json({ message: 'Task created successfully', task: created });
        console.log(`[API] POST /tasks response sent at ${new Date().toISOString()}`);
        taskEvents.emit('task-created', {
            title: created.title,
            createdAt: created.createdAt.toISOString(),
            assignedUser: req.user.email || req.user.id
        });
    } catch (err) {
        next(err);
    }
});

// ===============================
// PUT - Update task
// ===============================
app.put('/tasks/:id', requireAuth, validateTaskId, async (req, res, next) => {
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
        cache.del('all_tasks', `task:${req.params.id}`);
        res.status(200).json({ message: 'Task updated successfully', task: updated });
    } catch (err) {
        next(err);
    }
});

// ===============================
// DELETE - Delete task
// ===============================
app.delete('/tasks/:id', requireAuth, validateTaskId, async (req, res, next) => {
    try {
        const deleted = await Task.findByIdAndDelete(req.params.id).lean();
        if (!deleted) return res.status(404).json({ error: 'Task not found' });
        cache.del('all_tasks', `task:${req.params.id}`);
        res.status(200).json({ message: 'Task deleted successfully', task: deleted });
        taskEvents.emit('task-deleted', {
            title: deleted.title,
            deletedAt: new Date().toISOString(),
            deletedBy: req.user.email || req.user.id
        });
    } catch (err) {
        next(err);
    }
});

app.get('/debug/cache', requireAuth, (req, res) => {
    res.status(200).json({ ...cacheStats, enabled: cacheEnabled, keys: cache.keys().length, ttlSeconds: cache.options.stdTTL });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Structured error handler
app.use((err, req, res, _next) => {
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

