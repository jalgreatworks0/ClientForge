/**
 * Activity Template: Task Created
 * Triggered when a new task is created in the system
 */

export const taskCreatedTemplate = {
  id: 'task-created',
  name: 'Task Created',
  category: 'tasks',
  priority: 'medium',
  description: 'Activity logged when a user creates a new task',

  generateActivity: (data: any) => ({
    type: 'task.created',
    title: `Created task: ${data.taskTitle}`,
    description: `${data.userName} created a new task "${data.taskTitle}"`,
    metadata: {
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate,
      priority: data.priority,
    },
    icon: 'task-add',
    color: '#4CAF50',
  }),

  // Example usage
  example: {
    taskId: 'task-123',
    taskTitle: 'Follow up with client',
    userName: 'John Doe',
    assignedTo: 'Jane Smith',
    dueDate: '2025-12-01',
    priority: 'high',
  },
};
