const taskEvents = require('./events');

taskEvents.on('task-created', (task) => {
    setTimeout(() => {
        try {
            console.log(`[Notification] task-created handled at ${new Date().toISOString()} | title: "${task.title}" | created at: ${task.createdAt} | assigned user: ${task.assignedUser}`);
        } catch (error) {
            taskEvents.emit('error', error);
        }
    }, 2000);
});

taskEvents.on('task-deleted', (task) => {
    console.log(`[Notification] task-deleted at ${task.deletedAt} | title: "${task.title}" | deleted by: ${task.deletedBy}`);
});

taskEvents.on('error', (error) => {
    console.error('[Task event error]', error);
});