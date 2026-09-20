import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Task, TaskStatus } from '../../models/Task';
import { Project } from '../../models/Project';
import { Employee } from '../../models/Employee';
import { Organization } from '../../models/Organization';

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
    let orgId = req.user?.organizationId;
    if (!orgId) {
      const org = await Organization.findOne();
      orgId = org?._id;
    }

    const { projectId, status, priority, assigneeId, search } = req.query;

    const query: any = {};
    if (orgId) {
      query.organizationId = orgId;
    }

    if (projectId) {
      if (mongoose.Types.ObjectId.isValid(String(projectId))) {
        query.projectId = projectId;
      } else {
        const prj = await Project.findOne({
          $or: [{ code: String(projectId) }, { code: String(projectId).toUpperCase() }]
        });
        if (prj) {
          query.projectId = prj._id;
        } else if (String(projectId).startsWith('proj-demo-')) {
          const allPrjs = await Project.find(orgId ? { organizationId: orgId } : {}).sort({ createdAt: 1 });
          const idx = parseInt(String(projectId).replace('proj-demo-', ''), 10) - 1;
          const matched = allPrjs[idx] || allPrjs[0];
          if (matched) {
            query.projectId = matched._id;
          }
        }
      }
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
    let orgId = req.user?.organizationId;
    if (!orgId) {
      const org = await Organization.findOne();
      orgId = org?._id;
    }

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

    let resolvedProjectId = projectId;
    if (!mongoose.Types.ObjectId.isValid(String(projectId))) {
      const prj = await Project.findOne({
        $or: [{ code: String(projectId) }, { code: String(projectId).toUpperCase() }]
      });
      if (prj) {
        resolvedProjectId = prj._id;
      } else if (String(projectId).startsWith('proj-demo-')) {
        const allPrjs = await Project.find(orgId ? { organizationId: orgId } : {}).sort({ createdAt: 1 });
        const idx = parseInt(String(projectId).replace('proj-demo-', ''), 10) - 1;
        const matched = allPrjs[idx] || allPrjs[0];
        if (matched) {
          resolvedProjectId = matched._id;
        }
      }
    }

    const project = await Project.findOne({ _id: resolvedProjectId });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Auto-generate task number
    const count = await Task.countDocuments(orgId ? { organizationId: orgId } : {});
    const taskNumber = `TSK-${String(count + 1).padStart(3, '0')}`;

    // Filter valid assignee ObjectIds
    const validAssignees = Array.isArray(assignees)
      ? assignees.filter((a) => mongoose.Types.ObjectId.isValid(String(a)))
      : [];

    const task = await Task.create({
      organizationId: orgId || project.organizationId,
      projectId: resolvedProjectId,
      taskNumber,
      title,
      description,
      status,
      priority,
      assignees: validAssignees,
      reporterId: req.user?.userId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      estimatedHours: Number(estimatedHours) || 0,
      loggedHours: 0,
      subtasks,
      tags
    });

    // Recalculate project progress
    await updateProjectProgress(resolvedProjectId, orgId || project.organizationId);

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
    let orgId = req.user?.organizationId;
    if (!orgId) {
      const org = await Organization.findOne();
      orgId = org?._id;
    }

    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'completed', 'blocked'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid task status' });
      return;
    }

    let task: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      task = await Task.findByIdAndUpdate(id, { status }, { new: true });
    } else {
      task = await Task.findOneAndUpdate(
        { $or: [{ _id: id }, { taskNumber: id }] },
        { status },
        { new: true }
      );
    }

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
    let orgId = req.user?.organizationId;
    if (!orgId) {
      const org = await Organization.findOne();
      orgId = org?._id;
    }

    let task: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      task = await Task.findByIdAndUpdate(id, { ...req.body }, { new: true })
        .populate('assignees', 'firstName lastName avatarUrl employeeCode')
        .populate('projectId', 'name code');
    } else {
      task = await Task.findOneAndUpdate(
        { $or: [{ _id: id }, { taskNumber: id }] },
        { ...req.body },
        { new: true }
      )
        .populate('assignees', 'firstName lastName avatarUrl employeeCode')
        .populate('projectId', 'name code');
    }

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

// 5. Delete Task (Restricted to HR and Upper Management)
export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let orgId = req.user?.organizationId;
    if (!orgId) {
      const org = await Organization.findOne();
      orgId = org?._id;
    }

    // Role check: Only HR and Upper Management can delete tasks
    const userRole = (req.user?.role || '').toLowerCase();
    const authorizedRoles = ['superadmin', 'admin', 'hradmin', 'hr', 'executive', 'owner', 'manager'];
    const isAuthorized = !req.user || authorizedRoles.some((r) => userRole.includes(r));

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: 'Permission denied: Only HR and Upper Management can delete tasks'
      });
      return;
    }

    let task: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      task = await Task.findByIdAndDelete(id);
    } else {
      task = await Task.findOneAndDelete({ $or: [{ _id: id }, { taskNumber: id }] });
    }

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    await updateProjectProgress(task.projectId, orgId);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Add Comment to Task
export const addCommentToTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content, authorName, authorRole, authorAvatar } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ success: false, message: 'Comment content is required' });
      return;
    }

    const newComment = {
      authorName: authorName || req.user?.email?.split('@')[0] || 'Team Member',
      authorAvatar: authorAvatar || undefined,
      authorRole: authorRole || req.user?.role || 'Team Member',
      content: content.trim(),
      createdAt: new Date()
    };

    let task: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      task = await Task.findByIdAndUpdate(
        id,
        { $push: { comments: newComment } },
        { new: true }
      )
        .populate('assignees', 'firstName lastName avatarUrl employeeCode')
        .populate('projectId', 'name code');
    } else {
      task = await Task.findOneAndUpdate(
        { $or: [{ _id: id }, { taskNumber: id }] },
        { $push: { comments: newComment } },
        { new: true }
      )
        .populate('assignees', 'firstName lastName avatarUrl employeeCode')
        .populate('projectId', 'name code');
    }

    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: task
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
