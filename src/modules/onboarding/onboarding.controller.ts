import { Request, Response } from 'express';
import { OnboardingChecklist } from '../../models/OnboardingChecklist';

const DEFAULT_ONBOARDING_TASKS = [
  { title: 'Upload Government Photo ID & Tax Forms', category: 'documentation' as const, completed: true, completedAt: new Date() },
  { title: 'Provision Corporate Email & Slack Account', category: 'it_setup' as const, completed: true, completedAt: new Date() },
  { title: 'Configure Multi-Factor Authentication (2FA)', category: 'it_setup' as const, completed: true, completedAt: new Date() },
  { title: 'Review & Sign SparkX Employee Handbook', category: 'compliance' as const, completed: false },
  { title: 'Attend 1-on-1 Welcome Sync with Team Lead', category: 'introduction' as const, completed: false },
  { title: 'Complete Security & Data Privacy Training Module', category: 'training' as const, completed: false },
  { title: 'Setup Development Environment / Workstation Assets', category: 'it_setup' as const, completed: false }
];

export const getOnboardingChecklists = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const organizationId = user?.organizationId || '650000000000000000000001';

    let checklists = await OnboardingChecklist.find({ organizationId }).sort({ createdAt: -1 }).lean();

    if (checklists.length === 0) {
      // Seed demo new hires in onboarding
      const demoChecklists = [
        {
          organizationId,
          employeeName: 'Elena Rostova',
          employeeEmail: 'elena@sparkx.corp',
          department: 'Human Resources & People Ops',
          role: 'Senior People Operations Specialist',
          startDate: new Date('2026-09-01'),
          targetCompletionDate: new Date('2026-09-25'),
          tasks: [
            { title: 'Upload Government Photo ID & Tax Forms', category: 'documentation' as const, completed: true, completedAt: new Date() },
            { title: 'Provision Corporate Email & Slack Account', category: 'it_setup' as const, completed: true, completedAt: new Date() },
            { title: 'Configure Multi-Factor Authentication (2FA)', category: 'it_setup' as const, completed: true, completedAt: new Date() },
            { title: 'Review & Sign SparkX Employee Handbook', category: 'compliance' as const, completed: true, completedAt: new Date() },
            { title: 'Attend 1-on-1 Welcome Sync with Team Lead', category: 'introduction' as const, completed: true, completedAt: new Date() },
            { title: 'Complete Security & Data Privacy Training Module', category: 'training' as const, completed: false },
            { title: 'Setup Development Environment / Workstation Assets', category: 'it_setup' as const, completed: false }
          ],
          progress: 71,
          status: 'in_progress' as const
        },
        {
          organizationId,
          employeeName: 'Marcus Vance',
          employeeEmail: 'marcus.vance@sparkx.corp',
          department: 'Engineering & Technology',
          role: 'Frontend Tech Lead',
          startDate: new Date('2026-09-08'),
          targetCompletionDate: new Date('2026-09-30'),
          tasks: [
            { title: 'Upload Government Photo ID & Tax Forms', category: 'documentation' as const, completed: true, completedAt: new Date() },
            { title: 'Provision Corporate Email & Slack Account', category: 'it_setup' as const, completed: true, completedAt: new Date() },
            { title: 'Configure Multi-Factor Authentication (2FA)', category: 'it_setup' as const, completed: true, completedAt: new Date() },
            { title: 'Review & Sign SparkX Employee Handbook', category: 'compliance' as const, completed: false },
            { title: 'Attend 1-on-1 Welcome Sync with Team Lead', category: 'introduction' as const, completed: false },
            { title: 'Complete Security & Data Privacy Training Module', category: 'training' as const, completed: false },
            { title: 'Setup Development Environment / Workstation Assets', category: 'it_setup' as const, completed: false }
          ],
          progress: 43,
          status: 'in_progress' as const
        },
        {
          organizationId,
          employeeName: 'Chloe Dupont',
          employeeEmail: 'chloe.dupont@sparkx.corp',
          department: 'Product & Design',
          role: 'Lead UX Researcher',
          startDate: new Date('2026-09-15'),
          targetCompletionDate: new Date('2026-10-05'),
          tasks: [
            { title: 'Upload Government Photo ID & Tax Forms', category: 'documentation' as const, completed: true, completedAt: new Date() },
            { title: 'Provision Corporate Email & Slack Account', category: 'it_setup' as const, completed: false },
            { title: 'Configure Multi-Factor Authentication (2FA)', category: 'it_setup' as const, completed: false },
            { title: 'Review & Sign SparkX Employee Handbook', category: 'compliance' as const, completed: false },
            { title: 'Attend 1-on-1 Welcome Sync with Team Lead', category: 'introduction' as const, completed: false },
            { title: 'Complete Security & Data Privacy Training Module', category: 'training' as const, completed: false },
            { title: 'Setup Development Environment / Workstation Assets', category: 'it_setup' as const, completed: false }
          ],
          progress: 14,
          status: 'in_progress' as const
        }
      ];

      try {
        await OnboardingChecklist.insertMany(demoChecklists);
        checklists = (await OnboardingChecklist.find({ organizationId }).sort({ createdAt: -1 }).lean()) as any;
      } catch (e) {
        console.warn('Could not insert demo onboarding:', e);
      }
    }

    res.json({
      success: true,
      data: checklists
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleOnboardingTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, taskIndex } = req.params;
    const checklist = await OnboardingChecklist.findById(id);

    if (!checklist) {
      res.status(404).json({ success: false, message: 'Onboarding checklist not found' });
      return;
    }

    const idx = parseInt(taskIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= checklist.tasks.length) {
      res.status(400).json({ success: false, message: 'Invalid task index' });
      return;
    }

    const task = checklist.tasks[idx];
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date() : undefined;

    const completedCount = checklist.tasks.filter((t) => t.completed).length;
    checklist.progress = Math.round((completedCount / checklist.tasks.length) * 100);
    checklist.status = checklist.progress === 100 ? 'completed' : 'in_progress';

    await checklist.save();

    res.json({
      success: true,
      data: checklist
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createOnboardingChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const organizationId = user?.organizationId || '650000000000000000000001';
    const { employeeName, employeeEmail, department, role, customTasks } = req.body;

    const tasks = customTasks && Array.isArray(customTasks) && customTasks.length > 0
      ? customTasks
      : DEFAULT_ONBOARDING_TASKS;

    const checklist = await OnboardingChecklist.create({
      organizationId,
      employeeName,
      employeeEmail,
      department,
      role,
      tasks,
      progress: 0,
      status: 'in_progress'
    });

    res.status(201).json({
      success: true,
      data: checklist
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
