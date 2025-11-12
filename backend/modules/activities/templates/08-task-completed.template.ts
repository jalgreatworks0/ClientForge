/**
 * Activity Template: Task Completed
 * Triggered when a task is marked as complete
 */

export const taskCompletedTemplate = {
  id: 'task-completed',
  name: 'Task Completed',
  category: 'tasks',
  priority: 'medium',
  description: 'Activity logged when a task is completed',

  generateActivity: (data: any) => ({
    type: 'task.completed',
    title: `Completed: ${data.taskTitle}`,
    description: `${data.userName} completed task "${data.taskTitle}" ${data.completedOnTime ? 'on time' : data.daysLate + ' days late'}`,
    metadata: {
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      completedDate: data.completedDate,
      completedOnTime: data.completedOnTime,
      daysLate: data.daysLate,
      originalDueDate: data.originalDueDate,
    },
    icon: 'check-circle',
    color: '#4CAF50',
  }),

  example: {
    taskId: 'task-123',
    taskTitle: 'Follow up with client',
    userName: 'Jane Smith',
    completedDate: '2025-11-15',
    completedOnTime: true,
    daysLate: 0,
    originalDueDate: '2025-11-15',
  },
};
