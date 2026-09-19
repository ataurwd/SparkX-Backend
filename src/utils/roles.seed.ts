import mongoose from 'mongoose';
import { Role } from '../models/Role';

export const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
  'Owner': ['*'],
  'HR Admin': [
    'employees.read', 'employees.write', 'employees.delete',
    'attendance.read', 'attendance.manage',
    'leave.read', 'leave.approve_hr',
    'recruitment.read', 'recruitment.manage',
    'announcements.manage', 'org.read', 'org.manage'
  ],
  'Finance Manager': [
    'payroll.read', 'payroll.manage', 'payroll.approve',
    'salary.read', 'salary.manage',
    'employees.read', 'reports.finance'
  ],
  'Department Manager': [
    'employees.read', 'team.manage',
    'attendance.read',
    'leave.read', 'leave.approve_manager',
    'projects.read', 'projects.manage',
    'tasks.manage', 'performance.evaluate'
  ],
  'Team Lead': [
    'employees.read',
    'attendance.read',
    'projects.read',
    'tasks.manage', 'progress.read'
  ],
  'Recruiter': [
    'recruitment.read', 'recruitment.manage',
    'employees.read'
  ],
  'Employee': [
    'attendance.checkin',
    'leave.apply',
    'tasks.read', 'tasks.update_status',
    'goals.read', 'goals.update',
    'payslip.view_own',
    'chat.participate',
    'calendar.view'
  ]
};

export async function seedOrganizationRoles(organizationId: mongoose.Types.ObjectId): Promise<void> {
  for (const [roleName, permissions] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    await Role.findOneAndUpdate(
      { organizationId, name: roleName },
      {
        organizationId,
        name: roleName,
        permissions,
        isSystemRole: true,
        description: `System defined ${roleName} role`
      },
      { upsert: true, new: true }
    );
  }
}
