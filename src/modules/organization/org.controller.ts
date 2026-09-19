import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Department } from '../../models/Department';
import { Team } from '../../models/Team';
import { Designation } from '../../models/Designation';
import { Role } from '../../models/Role';
import { User } from '../../models/User';

// --- DEPARTMENTS ---
export async function getDepartments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const departments = await Department.find({ organizationId })
      .populate('managerId', 'firstName lastName email avatarUrl')
      .populate('parentDepartmentId', 'name')
      .sort({ name: 1 });

    // Count members in each department
    const deptStats = await Promise.all(
      departments.map(async (dept) => {
        const teamCount = await Team.countDocuments({ departmentId: dept._id });
        return {
          ...dept.toObject(),
          teamCount
        };
      })
    );

    res.status(200).json({ success: true, data: deptStats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { name, code, managerId, parentDepartmentId, color } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Department name is required' });
      return;
    }

    const existing = await Department.findOne({ organizationId, name: name.trim() });
    if (existing) {
      res.status(400).json({ success: false, error: 'Department name already exists in organization' });
      return;
    }

    const department = await Department.create({
      organizationId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : undefined,
      managerId: managerId || undefined,
      parentDepartmentId: parentDepartmentId || undefined,
      color: color || '#6C5CE7'
    });

    res.status(201).json({ success: true, data: department });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- TEAMS ---
export async function getTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { departmentId } = req.query;

    const query: any = { organizationId };
    if (departmentId) query.departmentId = departmentId;

    const teams = await Team.find(query)
      .populate('departmentId', 'name color')
      .populate('leadId', 'firstName lastName email avatarUrl')
      .sort({ name: 1 });

    res.status(200).json({ success: true, data: teams });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { name, departmentId, leadId, description } = req.body;

    if (!name || !departmentId) {
      res.status(400).json({ success: false, error: 'Team name and department are required' });
      return;
    }

    const team = await Team.create({
      organizationId,
      departmentId,
      leadId: leadId || undefined,
      name: name.trim(),
      description
    });

    res.status(201).json({ success: true, data: team });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- DESIGNATIONS ---
export async function getDesignations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const designations = await Designation.find({ organizationId })
      .populate('departmentId', 'name')
      .sort({ title: 1 });

    res.status(200).json({ success: true, data: designations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createDesignation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { title, departmentId, level, description } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: 'Designation title is required' });
      return;
    }

    const designation = await Designation.create({
      organizationId,
      title: title.trim(),
      departmentId: departmentId || undefined,
      level: level || 'Mid',
      description
    });

    res.status(201).json({ success: true, data: designation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- ROLES & PERMISSIONS ---
export async function getRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const roles = await Role.find({ organizationId }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: roles });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateRolePermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json({ success: false, error: 'Permissions must be an array of strings' });
      return;
    }

    const role = await Role.findOneAndUpdate(
      { _id: id, organizationId },
      { permissions },
      { new: true }
    );

    if (!role) {
      res.status(404).json({ success: false, error: 'Role not found' });
      return;
    }

    res.status(200).json({ success: true, data: role });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- VISUAL ORG CHART TREE ---
export async function getOrgTree(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;

    // Fetch leadership / CEO
    const owner = await User.findOne({ organizationId, role: 'Owner' }).select('firstName lastName email avatarUrl role');
    const departments = await Department.find({ organizationId }).populate('managerId', 'firstName lastName email avatarUrl');
    const teams = await Team.find({ organizationId }).populate('leadId', 'firstName lastName email avatarUrl');

    const tree = {
      title: owner ? `${owner.firstName} ${owner.lastName}` : 'Executive Leadership',
      role: 'CEO / Board',
      email: owner?.email,
      avatarUrl: owner?.avatarUrl,
      type: 'root',
      children: departments.map((dept) => {
        const deptTeams = teams.filter((t) => t.departmentId.toString() === dept._id.toString());
        const manager: any = dept.managerId;
        return {
          id: dept._id,
          title: dept.name,
          code: dept.code,
          role: manager ? `HOD: ${manager.firstName} ${manager.lastName}` : 'Head of Department',
          color: dept.color,
          type: 'department',
          children: deptTeams.map((team) => {
            const lead: any = team.leadId;
            return {
              id: team._id,
              title: team.name,
              role: lead ? `Lead: ${lead.firstName} ${lead.lastName}` : 'Team Lead',
              type: 'team'
            };
          })
        };
      })
    };

    res.status(200).json({ success: true, data: tree });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
