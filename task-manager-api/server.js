
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
// POST - Create task
// ===============================
app.post('/tasks', requireAuth, async (req, res, next) => {
    try {
        const { title, completed, description, priority } = req.body;
        if (!title || typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }
        const taskPayload = { title: title.trim(), completed: Boolean(completed) };
        if (description && typeof description === 'string') taskPayload.description = description.trim();
        if (priority && ['low', 'medium', 'high'].includes(priority)) taskPayload.priority = priority;

        const created = await Task.create(taskPayload);
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
        const { title, completed, description, priority } = req.body;
        if (title !== undefined) {
            if (typeof title !== 'string' || title.trim() === '') return res.status(400).json({ error: 'Title must be a non-empty string' });
            updates.title = title.trim();
        }
        if (completed !== undefined) updates.completed = Boolean(completed);
        if (description !== undefined) updates.description = typeof description === 'string' ? description.trim() : '';
        if (priority !== undefined && ['low', 'medium', 'high'].includes(priority)) updates.priority = priority;

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

// ===============================
// Practical 13: External AI API Route
// ===============================
const aiCooldowns = new Map();

const handleAiDescription = async (req, res) => {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required to generate description' });
    }

    const clientId = req.user?.id || req.ip || 'anonymous';
    const lastTime = aiCooldowns.get(clientId) || 0;
    const now = Date.now();

    // Supplementary Problem: Rate limiting (5 seconds cooldown)
    if (now - lastTime < 5000) {
        return res.status(429).json({
            error: 'Rate limit: Please wait 5 seconds before requesting another AI description',
            rateLimited: true
        });
    }

    aiCooldowns.set(clientId, now);

    try {
        // 1. OpenAI integration if key is provided
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
            const OpenAI = require('openai');
            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() });
            const completion = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an intelligent task assistant. Generate a clear, concise, actionable task description (1-2 sentences).' },
                    { role: 'user', content: `Write a short task description for: ${title.trim()}` }
                ],
                max_tokens: 120
            });
            const generated = completion.choices[0]?.message?.content?.trim();
            if (generated) {
                return res.status(200).json({
                    description: generated,
                    fallback: false,
                    provider: 'OpenAI (gpt-4o-mini)',
                    disclaimer: 'AI-generated suggestion. Please review and modify before saving.'
                });
            }
        }

        // 2. Google Gemini integration if key is provided
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY.trim()}`;
            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Write a short 1-2 sentence actionable task description for: ${title.trim()}` }] }]
                })
            });
            const data = await geminiResponse.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
                return res.status(200).json({
                    description: text,
                    fallback: false,
                    provider: 'Google Gemini',
                    disclaimer: 'AI-generated suggestion. Please review and modify before saving.'
                });
            }
        }

        // Graceful Fallback if no external key is configured
        const cleanTitle = title.trim();
        return res.status(200).json({
            description: `Objective: Execute "${cleanTitle}". Review specifications, complete required steps, and verify results.`,
            fallback: true,
            provider: 'Contextual Fallback Engine',
            disclaimer: 'Generated in graceful fallback mode (No external API key configured).'
        });
    } catch (err) {
        console.warn('AI API call failed, degrading gracefully:', err.message);
        // Step 6: Graceful degradation failure path - never crash, return fallback
        const cleanTitle = title.trim();
        return res.status(200).json({
            description: `Task: Complete "${cleanTitle}". Ensure all deliverable milestones are met.`,
            fallback: true,
            provider: 'Offline Resilience Fallback',
            disclaimer: 'Generated via fallback (Third-party AI service temporarily unavailable).'
        });
    }
};

app.post('/api/ai/generate-description', requireAuth, handleAiDescription);
app.post('/ai/generate-description', requireAuth, handleAiDescription);

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

