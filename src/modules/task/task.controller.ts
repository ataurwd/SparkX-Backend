import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Task, TaskStatus } from '../../models/Task';
import { Project } from '../../models/Project';
import { Employee } from '../../models/Employee';

// Helper to recalculate parent project progress
async function updateProjectProgress(projectId: any, orgId: any) {
  try {
    const total = await Task.countDocuments({ projectId, organizationId: orgId });
    if (total === 0) return;
    const completed = await Task.countDocuments({ projectId, organizationId: orgId, status: 'completed' });
    const progress = Math.round((completed / total) * 100);
    await Project.updateOne({ _id: projectId }, { progress });
  } catch (err) {
    console.warn('[Task] Could not update project progress:', err);
  }
}

// 1. Get tasks with filtering
export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { projectId, status, priority, assigneeId, search } = req.query;

    const query: any = { organizationId: orgId };
    if (projectId) {
      query.projectId = projectId;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    if (assigneeId) {
      query.assignees = assigneeId;
    }
    if (search) {
      query.$or = [
        { title: { $regex: String(search), $options: 'i' } },
        { taskNumber: { $regex: String(search), $options: 'i' } }
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignees', 'firstName lastName avatarUrl employeeCode email')
      .populate('projectId', 'name code')
      .populate('reporterId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Create Task
export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const {
      projectId,
      title,
      description,
      status = 'todo',
      priority = 'medium',
      assignees = [],
      dueDate,
      estimatedHours = 0,
      subtasks = [],
      tags = []
    } = req.body;

    if (!projectId || !title) {
      res.status(400).json({ success: false, message: 'Project ID and title are required' });
      return;
    }

    const project = await Project.findOne({ _id: projectId, organizationId: orgId });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Auto-generate task number
    const count = await Task.countDocuments({ organizationId: orgId });
    const taskNumber = `TSK-${String(count + 1).padStart(3, '0')}`;

    const task = await Task.create({
      organizationId: orgId,
      projectId,
      taskNumber,
      title,
      description,
      status,
      priority,
      assignees,
      reporterId: req.user?.userId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours: Number(estimatedHours) || 0,
      loggedHours: 0,
      subtasks,
      tags
    });

    // Recalculate project progress
    await updateProjectProgress(projectId, orgId);

    const populatedTask = await Task.findById(task._id)
      .populate('assignees', 'firstName lastName avatarUrl employeeCode')
      .populate('projectId', 'name code');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Update Task Status (Kanban drag-and-drop or column transition)
export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orgId = req.user?.organizationId;

    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'completed', 'blocked'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid task status' });
      return;
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { status },
      { new: true }
    );

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    // Recalculate parent project progress
    await updateProjectProgress(task.projectId, orgId);

    res.status(200).json({
      success: true,
      message: `Task moved to ${status}`,
      data: task
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update Task Details
export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user?.organizationId;

    const task = await Task.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { ...req.body },
      { new: true }
    )
      .populate('assignees', 'firstName lastName avatarUrl employeeCode')
      .populate('projectId', 'name code');

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (req.body.status) {
      await updateProjectProgress(task.projectId, orgId);
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete Task
export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user?.organizationId;

    const task = await Task.findOneAndDelete({ _id: id, organizationId: orgId });
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    await updateProjectProgress(task.projectId, orgId);

    res.status(200).json({
      success: true,
      message: 'Task removed successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Employee self-service: My Assigned Tasks
export const getMyTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const userId = req.user?.userId;

    let employee = await Employee.findOne({ organizationId: orgId, userId });
    if (!employee) {
      const { User } = await import('../../models/User');
      const user = await User.findById(userId);
      if (user) {
        employee = await Employee.findOne({ organizationId: orgId, email: user.email.toLowerCase() });
      }
    }

    if (!employee) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const tasks = await Task.find({
      organizationId: orgId,
      assignees: employee._id
    })
      .populate('projectId', 'name code')
      .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json({ success: true, data: tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
