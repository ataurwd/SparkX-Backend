import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Project } from '../../models/Project';
import { Task } from '../../models/Task';
import { Department } from '../../models/Department';
import { Employee } from '../../models/Employee';
import { Organization } from '../../models/Organization';

const getEffectiveOrgId = async (req: AuthenticatedRequest) => {
  if (req.user?.organizationId) return req.user.organizationId;
  let org = await Organization.findOne();
  if (!org) {
    org = await Organization.create({
      name: 'SparkX Global Tech',
      slug: 'sparkx-global',
      contactEmail: 'admin@sparkx.io'
    });
  }
  return org._id;
};

// Helper to seed standard initial projects if database has none
const seedProjects = async (orgId: any) => {
  try {
    const depts = await Department.find({ organizationId: orgId });
    const emps = await Employee.find({ organizationId: orgId });

    const engDept = depts.find((d) => d.name.includes('Engineering') || d.name.includes('Backend'))?._id || depts[0]?._id;
    const finDept = depts.find((d) => d.name.includes('Finance'))?._id || depts[0]?._id;
    const prdDept = depts.find((d) => d.name.includes('Product') || d.name.includes('Design'))?._id || depts[0]?._id;

    const lead1 = emps[0]?._id;
    const lead2 = emps[1]?._id || emps[0]?._id;
    const lead3 = emps[2]?._id || emps[0]?._id;

    const sample = [
      {
        organizationId: orgId,
        name: 'SparkX Cloud Native Infrastructure Modernization',
        code: 'INFRA-2026',
        description: 'Migrating multi-tenant microservices to auto-scaling Kubernetes cluster with 99.99% uptime SLA.',
        status: 'active',
        priority: 'high',
        budget: 85000,
        currency: 'USD',
        progress: 72,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-11-30'),
        departmentId: engDept,
        managerId: lead1,
        members: emps.slice(0, 3).map((e) => e._id),
        milestones: [
          { title: 'Kubernetes Cluster Provisioning (EKS/GKE)', dueDate: new Date('2026-09-01'), completed: true },
          { title: 'Service Mesh & Vault Ingress Setup', dueDate: new Date('2026-10-15'), completed: true },
          { title: 'Zero-downtime Blue/Green Production Cutover', dueDate: new Date('2026-11-25'), completed: false }
        ]
      },
      {
        organizationId: orgId,
        name: 'Enterprise Payroll & Tax Automation Engine 2.0',
        code: 'FIN-PAY',
        description: 'Automated 30-day payroll batch calculation, statutory deduction rules, and PDF payslip delivery.',
        status: 'active',
        priority: 'urgent',
        budget: 62000,
        currency: 'USD',
        progress: 58,
        startDate: new Date('2026-08-15'),
        endDate: new Date('2026-12-15'),
        departmentId: finDept,
        managerId: lead2,
        members: emps.slice(1, 4).map((e) => e._id),
        milestones: [
          { title: 'Tax Formula & Deduction Rules Engine', dueDate: new Date('2026-09-20'), completed: true },
          { title: 'Automated Bank Batch Wire Dispatcher', dueDate: new Date('2026-10-30'), completed: false },
          { title: 'Employee Self-Service Payslip Vault & PDF Gen', dueDate: new Date('2026-12-05'), completed: false }
        ]
      },
      {
        organizationId: orgId,
        name: 'Unified Design System & Dark/Light Accessibility Suite',
        code: 'DS-ACC',
        description: 'Comprehensive design tokens, high contrast WCAG 2.1 AAA dark mode and responsive layout engine.',
        status: 'completed',
        priority: 'medium',
        budget: 34000,
        currency: 'USD',
        progress: 100,
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-09-10'),
        departmentId: prdDept,
        managerId: lead3,
        members: emps.slice(2, 5).map((e) => e._id),
        milestones: [
          { title: 'Figma Tokens & CSS Variables Audit', dueDate: new Date('2026-07-20'), completed: true },
          { title: 'Component Library WCAG 2.1 AAA Compliance Test', dueDate: new Date('2026-08-15'), completed: true },
          { title: 'Dark Mode Switcher & Performance Benchmark', dueDate: new Date('2026-09-05'), completed: true }
        ]
      }
    ];

    const createdProjects = await Project.insertMany(sample);

    if (createdProjects.length > 0) {
      const p1 = createdProjects[0];
      const sampleTasks = [
        {
          organizationId: orgId,
          projectId: p1._id,
          taskNumber: 'TSK-101',
          title: 'Provision Multi-AZ Terraform Kubernetes Clusters',
          description: 'Set up resilient multi-region infrastructure using infrastructure-as-code.',
          status: 'completed',
          priority: 'high',
          dueDate: new Date('2026-08-20'),
          estimatedHours: 16,
          loggedHours: 18,
          tags: ['DevOps', 'Terraform', 'Kubernetes']
        },
        {
          organizationId: orgId,
          projectId: p1._id,
          taskNumber: 'TSK-102',
          title: 'Configure Vault Secret Rotation for Database Endpoints',
          description: 'Eliminate hardcoded secrets and automate dynamic MongoDB credentials.',
          status: 'in_progress',
          priority: 'urgent',
          dueDate: new Date('2026-10-05'),
          estimatedHours: 12,
          loggedHours: 6,
          tags: ['Security', 'Vault', 'Backend']
        },
        {
          organizationId: orgId,
          projectId: p1._id,
          taskNumber: 'TSK-103',
          title: 'Design Istio Envoy Canary Routing Rules',
          description: 'Enable 5% canary traffic slicing for staging zero-downtime updates.',
          status: 'todo',
          priority: 'medium',
          dueDate: new Date('2026-10-25'),
          estimatedHours: 8,
          loggedHours: 0,
          tags: ['Networking', 'Istio']
        }
      ];
      await Task.insertMany(sampleTasks);
    }
  } catch (err: any) {
    console.warn('[Project Seed Notice]:', err.message);
  }
};

// 1. Get all projects with task statistics
export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = await getEffectiveOrgId(req);
    const { status, departmentId, search } = req.query;

    const count = await Project.countDocuments({ organizationId: orgId });
    if (count === 0 && orgId) {
      await seedProjects(orgId);
    }

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
    const orgId = await getEffectiveOrgId(req);

    // Auto seed if empty
    const count = await Project.countDocuments({ organizationId: orgId });
    if (count === 0 && orgId) {
      await seedProjects(orgId);
    }

    let project: any = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      project = await Project.findOne({ _id: id, organizationId: orgId })
        .populate('departmentId', 'name code')
        .populate('managerId', 'firstName lastName avatarUrl email employeeCode')
        .populate('members', 'firstName lastName avatarUrl email employeeCode');
    }

    // Fallback: If not found by ObjectId, search by code (e.g. INFRA-2026, FIN-PAY, DS-ACC)
    if (!project) {
      project = await Project.findOne({
        organizationId: orgId,
        $or: [{ code: id.toUpperCase() }, { code: id }]
      })
        .populate('departmentId', 'name code')
        .populate('managerId', 'firstName lastName avatarUrl email employeeCode')
        .populate('members', 'firstName lastName avatarUrl email employeeCode');
    }

    // Fallback for demo IDs like 'proj-demo-1', 'proj-demo-2', 'proj-demo-3'
    if (!project) {
      const allProjects = await Project.find({ organizationId: orgId })
        .populate('departmentId', 'name code')
        .populate('managerId', 'firstName lastName avatarUrl email employeeCode')
        .populate('members', 'firstName lastName avatarUrl email employeeCode')
        .sort({ createdAt: 1 });

      if (allProjects.length > 0) {
        if (id.startsWith('proj-demo-')) {
          const idx = parseInt(id.replace('proj-demo-', ''), 10) - 1;
          project = allProjects[idx] || allProjects[0];
        } else {
          project = allProjects[0];
        }
      }
    }

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const projectId = project._id;
    const totalTasks = await Task.countDocuments({ projectId });
    const completedTasks = await Task.countDocuments({ projectId, status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ projectId, status: 'in_progress' });
    const blockedTasks = await Task.countDocuments({ projectId, status: 'blocked' });

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
