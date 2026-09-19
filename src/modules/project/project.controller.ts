import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Project } from '../../models/Project';
import { Task } from '../../models/Task';

// 1. Get all projects with task statistics
export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { status, departmentId, search } = req.query;

    const query: any = { organizationId: orgId };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (departmentId) {
      query.departmentId = departmentId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { code: { $regex: String(search), $options: 'i' } }
      ];
    }

    const projects = await Project.find(query)
      .populate('departmentId', 'name code')
      .populate('managerId', 'firstName lastName avatarUrl employeeCode')
      .populate('members', 'firstName lastName avatarUrl employeeCode')
      .sort({ createdAt: -1 });

    // Attach task summary to each project
    const projectList = await Promise.all(
      projects.map(async (prj) => {
        const totalTasks = await Task.countDocuments({ projectId: prj._id });
        const completedTasks = await Task.countDocuments({ projectId: prj._id, status: 'completed' });
        const inProgressTasks = await Task.countDocuments({ projectId: prj._id, status: 'in_progress' });
        const blockedTasks = await Task.countDocuments({ projectId: prj._id, status: 'blocked' });

        const calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : prj.progress;

        return {
          ...prj.toObject(),
          totalTasks,
          completedTasks,
          inProgressTasks,
          blockedTasks,
          progress: calculatedProgress
        };
      })
    );

    res.status(200).json({ success: true, data: projectList });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get project by ID with live metrics
export const getProjectById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user?.organizationId;

    const project = await Project.findOne({ _id: id, organizationId: orgId })
      .populate('departmentId', 'name code')
      .populate('managerId', 'firstName lastName avatarUrl email employeeCode')
      .populate('members', 'firstName lastName avatarUrl email employeeCode');

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const totalTasks = await Task.countDocuments({ projectId: id });
    const completedTasks = await Task.countDocuments({ projectId: id, status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ projectId: id, status: 'in_progress' });
    const blockedTasks = await Task.countDocuments({ projectId: id, status: 'blocked' });

    const calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progress;

    res.status(200).json({
      success: true,
      data: {
        ...project.toObject(),
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        progress: calculatedProgress
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Create Project
export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const {
      name,
      code,
      description,
      departmentId,
      managerId,
      members = [],
      startDate,
      endDate,
      priority = 'medium',
      status = 'active',
      budget = 0,
      currency = 'USD',
      milestones = [],
      tags = []
    } = req.body;

    if (!name || !endDate) {
      res.status(400).json({ success: false, message: 'Project name and end date are required' });
      return;
    }

    // Auto-generate code if empty
    let projectCode = code;
    if (!projectCode) {
      const count = await Project.countDocuments({ organizationId: orgId });
      projectCode = `PRJ-${String(count + 1).padStart(3, '0')}`;
    }

    const project = await Project.create({
      organizationId: orgId,
      name,
      code: projectCode.toUpperCase(),
      description,
      departmentId: departmentId || undefined,
      managerId: managerId || undefined,
      members,
      startDate: startDate || new Date(),
      endDate: new Date(endDate),
      priority,
      status,
      budget: Number(budget) || 0,
      currency: currency.toUpperCase(),
      milestones,
      tags
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update Project
export const updateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user?.organizationId;

    const project = await Project.findOneAndUpdate(
      { _id: id, organizationId: orgId },
      { ...req.body },
      { new: true }
    );

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete Project
export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user?.organizationId;

    const project = await Project.findOneAndDelete({ _id: id, organizationId: orgId });
    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Clean up all tasks belonging to this project
    await Task.deleteMany({ projectId: id, organizationId: orgId });

    res.status(200).json({
      success: true,
      message: 'Project and associated tasks removed successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
