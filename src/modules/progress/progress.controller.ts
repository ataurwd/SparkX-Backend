import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Task } from '../../models/Task';
import { Project } from '../../models/Project';
import { Employee } from '../../models/Employee';
import { Department } from '../../models/Department';

export const getWorkProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { departmentId } = req.query;

    const taskQuery: any = { organizationId: orgId };
    if (departmentId && departmentId !== 'all') {
      const projects = await Project.find({ organizationId: orgId, departmentId }).select('_id');
      const projectIds = projects.map((p) => p._id);
      taskQuery.projectId = { $in: projectIds };
    }

    // 1. Overall Task Roll Call
    const totalTasks = await Task.countDocuments(taskQuery);
    const completedTasks = await Task.countDocuments({ ...taskQuery, status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ ...taskQuery, status: 'in_progress' });
    const reviewTasks = await Task.countDocuments({ ...taskQuery, status: 'review' });
    const blockedTasks = await Task.countDocuments({ ...taskQuery, status: 'blocked' });
    const todoTasks = await Task.countDocuments({ ...taskQuery, status: 'todo' });

    const weeklyProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 2. Individual Member Work Velocity
    const employeeQuery: any = {
      organizationId: orgId,
      employmentStatus: { $in: ['active', 'probation'] }
    };
    if (departmentId && departmentId !== 'all') {
      employeeQuery.departmentId = departmentId;
    }

    const employees = await Employee.find(employeeQuery)
      .populate('departmentId', 'name')
      .populate('designationId', 'title')
      .select('firstName lastName employeeCode avatarUrl departmentId designationId')
      .limit(30);

    const memberProgress = await Promise.all(
      employees.map(async (emp) => {
        const empTotal = await Task.countDocuments({ organizationId: orgId, assignees: emp._id });
        const empCompleted = await Task.countDocuments({ organizationId: orgId, assignees: emp._id, status: 'completed' });
        const empInProgress = await Task.countDocuments({ organizationId: orgId, assignees: emp._id, status: 'in_progress' });
        const empBlocked = await Task.countDocuments({ organizationId: orgId, assignees: emp._id, status: 'blocked' });

        const progressPercent = empTotal > 0 ? Math.round((empCompleted / empTotal) * 100) : 0;

        return {
          employee: {
            _id: emp._id,
            name: `${emp.firstName} ${emp.lastName}`,
            code: emp.employeeCode,
            avatarUrl: emp.avatarUrl,
            department: (emp.departmentId as any)?.name || 'General',
            designation: (emp.designationId as any)?.title || 'Staff'
          },
          totalTasks: empTotal,
          completedTasks: empCompleted,
          inProgressTasks: empInProgress,
          blockedTasks: empBlocked,
          progressPercent
        };
      })
    );

    // 3. Department Rollup
    const departments = await Department.find({ organizationId: orgId });
    const departmentProgress = await Promise.all(
      departments.map(async (dept) => {
        const deptProjects = await Project.find({ organizationId: orgId, departmentId: dept._id }).select('_id');
        const pIds = deptProjects.map((p) => p._id);

        const dTotal = await Task.countDocuments({ organizationId: orgId, projectId: { $in: pIds } });
        const dCompleted = await Task.countDocuments({ organizationId: orgId, projectId: { $in: pIds }, status: 'completed' });
        const dBlocked = await Task.countDocuments({ organizationId: orgId, projectId: { $in: pIds }, status: 'blocked' });

        const dProgress = dTotal > 0 ? Math.round((dCompleted / dTotal) * 100) : 0;

        return {
          _id: dept._id,
          name: dept.name,
          color: dept.color,
          totalTasks: dTotal,
          completedTasks: dCompleted,
          blockedTasks: dBlocked,
          progressPercent: dProgress
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          reviewTasks,
          blockedTasks,
          todoTasks,
          weeklyProgress
        },
        memberProgress,
        departmentProgress
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
