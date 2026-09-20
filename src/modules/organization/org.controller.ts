import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Department } from '../../models/Department';
import { Team } from '../../models/Team';
import { Designation } from '../../models/Designation';
import { Role } from '../../models/Role';
import { User } from '../../models/User';
import { Employee } from '../../models/Employee';
import { seedOrganizationRoles } from '../../utils/roles.seed';

// --- DEPARTMENTS ---
export async function getDepartments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    let departments = await Department.find({ organizationId })
      .populate('managerId', 'firstName lastName email avatarUrl')
      .populate('parentDepartmentId', 'name')
      .sort({ name: 1 });

    // Auto-seed default departments if none exist
    if (departments.length === 0) {
      const defaultDepts = [
        { name: 'Engineering & Technology', code: 'ENG', color: '#6C5CE7', organizationId },
        { name: 'Product & Design', code: 'PRD', color: '#00B894', organizationId },
        { name: 'Sales & Revenue', code: 'SLS', color: '#10B981', organizationId },
        { name: 'Human Resources & People Ops', code: 'HRO', color: '#F59E0B', organizationId },
        { name: 'Finance & Accounting', code: 'FIN', color: '#0EA5E9', organizationId }
      ];
      await Department.insertMany(defaultDepts);
      departments = await Department.find({ organizationId })
        .populate('managerId', 'firstName lastName email avatarUrl')
        .populate('parentDepartmentId', 'name')
        .sort({ name: 1 });
    }

    // Count members in each department in real-time
    const deptStats = await Promise.all(
      departments.map(async (dept) => {
        const [teamCount, employeesCount, members] = await Promise.all([
          Team.countDocuments({ organizationId, departmentId: dept._id }),
          Employee.countDocuments({ organizationId, departmentId: dept._id }),
          Employee.find({ organizationId, departmentId: dept._id })
            .select('firstName lastName email avatarUrl employeeCode')
            .limit(6)
        ]);

        return {
          ...dept.toObject(),
          teamCount,
          teamsCount: teamCount,
          employeesCount,
          members
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
      .populate('departmentId', 'name color code')
      .populate({
        path: 'leadId',
        select: 'firstName lastName email avatarUrl employeeCode role designationId',
        populate: { path: 'designationId', select: 'title level' }
      })
      .sort({ name: 1 });

    // Fetch members for each team and attach
    const teamsWithMembers = await Promise.all(
      teams.map(async (t) => {
        const members = await Employee.find({ organizationId, teamId: t._id })
          .populate('designationId', 'title level')
          .populate('departmentId', 'name color')
          .select('firstName lastName email avatarUrl employeeCode role designationId departmentId employmentStatus joiningDate');

        const teamObj: any = t.toObject();
        return {
          ...teamObj,
          membersCount: members.length,
          members: members.map((m: any) => ({
            id: m._id,
            employeeCode: m.employeeCode,
            name: `${m.firstName} ${m.lastName}`,
            email: m.email,
            avatarUrl: m.avatarUrl,
            designation: m.designationId ? m.designationId.title : 'Staff Member',
            designationLevel: m.designationId ? m.designationId.level : 'Mid',
            department: m.departmentId ? m.departmentId.name : (teamObj.departmentId?.name || 'General'),
            role: m.role || 'Employee',
            status: m.employmentStatus || 'active',
            joiningDate: m.joiningDate
          }))
        };
      })
    );

    res.status(200).json({ success: true, data: teamsWithMembers });
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

    if (leadId) {
      await Employee.updateOne(
        { _id: leadId, organizationId },
        { teamId: team._id, ...(departmentId ? { departmentId } : {}) }
      );
    }

    const populatedTeam = await Team.findById(team._id)
      .populate('departmentId', 'name color code')
      .populate({
        path: 'leadId',
        select: 'firstName lastName email avatarUrl employeeCode role designationId',
        populate: { path: 'designationId', select: 'title level' }
      });

    res.status(201).json({ success: true, data: populatedTeam });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function assignTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id: teamId } = req.params;
    const { employeeId } = req.body;

    if (!employeeId) {
      res.status(400).json({ success: false, error: 'employeeId is required' });
      return;
    }

    const team = await Team.findOne({ _id: teamId, organizationId });
    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: employeeId, organizationId },
      { 
        teamId: team._id,
        ...(team.departmentId ? { departmentId: team.departmentId } : {})
      },
      { new: true }
    )
      .populate('departmentId', 'name color code')
      .populate('designationId', 'title level')
      .populate('teamId', 'name');

    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${employee.firstName} ${employee.lastName} to ${team.name}`,
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function removeTeamMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id: teamId, employeeId } = req.params;

    const employee = await Employee.findOneAndUpdate(
      { _id: employeeId, organizationId, teamId },
      { $unset: { teamId: 1 } },
      { new: true }
    );

    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found in this team' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Removed ${employee.firstName} ${employee.lastName} from team`,
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateTeamLead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id: teamId } = req.params;
    const { leadId } = req.body;

    const team = await Team.findOneAndUpdate(
      { _id: teamId, organizationId },
      { leadId: leadId || undefined },
      { new: true }
    )
      .populate('departmentId', 'name color code')
      .populate({
        path: 'leadId',
        select: 'firstName lastName email avatarUrl employeeCode role designationId',
        populate: { path: 'designationId', select: 'title level' }
      });

    if (!team) {
      res.status(404).json({ success: false, error: 'Team not found' });
      return;
    }

    if (leadId) {
      await Employee.updateOne(
        { _id: leadId, organizationId },
        { teamId: team._id, ...(team.departmentId ? { departmentId: team.departmentId } : {}) }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Team leader updated successfully',
      data: team
    });
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
    let roles = await Role.find({ organizationId }).sort({ createdAt: 1 });

    // Auto-seed standard system roles if none exist
    if (roles.length === 0) {
      await seedOrganizationRoles(new mongoose.Types.ObjectId(organizationId));
      roles = await Role.find({ organizationId }).sort({ createdAt: 1 });
    }

    const rolesWithCounts = await Promise.all(
      roles.map(async (r) => {
        const membersCount = await Employee.countDocuments({
          organizationId,
          $or: [{ role: r.name }, { roleId: r._id }]
        });
        return {
          ...r.toObject(),
          membersCount
        };
      })
    );

    res.status(200).json({ success: true, data: rolesWithCounts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, error: 'Role name is required' });
      return;
    }

    const existing = await Role.findOne({ organizationId, name: name.trim() });
    if (existing) {
      res.status(400).json({ success: false, error: `Role '${name.trim()}' already exists` });
      return;
    }

    const role = await Role.create({
      organizationId,
      name: name.trim(),
      description: description ? description.trim() : `Custom role: ${name.trim()}`,
      permissions: Array.isArray(permissions) ? permissions : [],
      isSystemRole: false
    });

    res.status(201).json({
      success: true,
      message: `Role '${role.name}' created successfully in MongoDB Atlas`,
      data: role
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function assignUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { employeeId, roleName, roleId } = req.body;

    if (!employeeId || (!roleName && !roleId)) {
      res.status(400).json({ success: false, error: 'employeeId and roleName (or roleId) are required' });
      return;
    }

    let targetRole = null;
    if (roleId) {
      targetRole = await Role.findOne({ _id: roleId, organizationId });
    }
    if (!targetRole && roleName) {
      targetRole = await Role.findOne({ name: roleName, organizationId });
    }

    const finalRoleName = targetRole ? targetRole.name : roleName;

    const employee = await Employee.findOneAndUpdate(
      { _id: employeeId, organizationId },
      {
        role: finalRoleName,
        roleId: targetRole?._id
      },
      { new: true }
    ).populate('departmentId', 'name color code');

    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    if (employee.userId) {
      await User.updateOne(
        { _id: employee.userId },
        {
          role: finalRoleName,
          roleId: targetRole?._id
        }
      );
    }

    res.status(200).json({
      success: true,
      message: `Successfully assigned role '${finalRoleName}' to ${employee.firstName} ${employee.lastName}`,
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getRoleAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;

    const employees = await Employee.find({ organizationId })
      .populate('departmentId', 'name color code')
      .populate('designationId', 'title level')
      .sort({ firstName: 1 });

    const assignments = employees.map((emp: any) => ({
      id: emp._id,
      code: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      avatarUrl: emp.avatarUrl,
      department: emp.departmentId ? emp.departmentId.name : 'Unassigned',
      departmentId: emp.departmentId ? emp.departmentId._id : null,
      departmentColor: emp.departmentId ? emp.departmentId.color : '#6C5CE7',
      designation: emp.designationId ? emp.designationId.title : 'Staff Member',
      role: emp.role || 'Employee',
      status: emp.employmentStatus || 'active'
    }));

    res.status(200).json({ success: true, data: assignments });
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
    const teams = await Team.find({ organizationId })
      .populate({
        path: 'leadId',
        select: 'firstName lastName email avatarUrl employeeCode role designationId',
        populate: { path: 'designationId', select: 'title level' }
      });

    // Fetch all employees in organization populated with designations
    const allEmployees = await Employee.find({ organizationId })
      .populate('designationId', 'title level')
      .select('firstName lastName email avatarUrl departmentId teamId designationId employeeCode role employmentStatus');

    const tree = {
      title: owner ? `${owner.firstName} ${owner.lastName}` : 'Executive Leadership',
      role: 'CEO / Board',
      designation: 'Chief Executive Officer',
      email: owner?.email,
      avatarUrl: owner?.avatarUrl,
      type: 'root',
      children: departments.map((dept) => {
        const deptTeams = teams.filter((t) => t.departmentId.toString() === dept._id.toString());
        const manager: any = dept.managerId;

        // Find employees in this department who are NOT in any team
        const deptUnassignedMembers = allEmployees.filter(
          (emp) => emp.departmentId && emp.departmentId.toString() === dept._id.toString() && !emp.teamId
        );

        return {
          id: dept._id,
          title: dept.name,
          code: dept.code,
          role: manager ? `HOD: ${manager.firstName} ${manager.lastName}` : 'Head of Department',
          managerName: manager ? `${manager.firstName} ${manager.lastName}` : undefined,
          color: dept.color,
          type: 'department',
          children: [
            ...deptTeams.map((team) => {
              const lead: any = team.leadId;
              const leadDesignation = lead?.designationId?.title || lead?.role || 'Team Leader';

              // Team members assigned to this team
              const teamMembers = allEmployees.filter(
                (emp) => emp.teamId && emp.teamId.toString() === team._id.toString()
              );

              return {
                id: team._id,
                title: team.name,
                role: lead ? `Team Lead: ${lead.firstName} ${lead.lastName}` : 'Team Lead',
                leadName: lead ? `${lead.firstName} ${lead.lastName}` : 'Unassigned',
                leadEmail: lead?.email,
                leadAvatar: lead?.avatarUrl,
                leadDesignation: leadDesignation,
                designation: leadDesignation,
                color: dept.color,
                type: 'team',
                membersCount: teamMembers.length,
                children: teamMembers.map((member: any) => ({
                  id: member._id,
                  name: `${member.firstName} ${member.lastName}`,
                  title: `${member.firstName} ${member.lastName}`,
                  role: member.role || 'Team Member',
                  designation: member.designationId ? member.designationId.title : 'Staff Specialist',
                  employeeCode: member.employeeCode,
                  email: member.email,
                  avatarUrl: member.avatarUrl,
                  department: dept.name,
                  color: dept.color,
                  type: 'member'
                }))
              };
            }),
            ...(deptUnassignedMembers.length > 0 ? [{
              id: `unassigned-${dept._id}`,
              title: `${dept.name} Direct Staff`,
              role: 'Department Staff',
              leadName: 'Direct Department Roster',
              designation: 'Department Staff',
              color: dept.color,
              type: 'team',
              membersCount: deptUnassignedMembers.length,
              children: deptUnassignedMembers.map((member: any) => ({
                id: member._id,
                name: `${member.firstName} ${member.lastName}`,
                title: `${member.firstName} ${member.lastName}`,
                role: member.role || 'Staff',
                designation: member.designationId ? member.designationId.title : 'Staff Specialist',
                employeeCode: member.employeeCode,
                email: member.email,
                avatarUrl: member.avatarUrl,
                department: dept.name,
                color: dept.color,
                type: 'member'
              }))
            }] : [])
          ]
        };
      })
    };

    res.status(200).json({ success: true, data: tree });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Assign employee to department
export async function assignEmployeeToDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id: departmentId } = req.params;
    const { employeeId } = req.body;

    if (!employeeId) {
      res.status(400).json({ success: false, error: 'employeeId is required' });
      return;
    }

    const dept = await Department.findOne({ _id: departmentId, organizationId });
    if (!dept) {
      res.status(404).json({ success: false, error: 'Department not found' });
      return;
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: employeeId, organizationId },
      { departmentId: dept._id },
      { new: true }
    ).populate('departmentId', 'name color code');

    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${employee.firstName} ${employee.lastName} to ${dept.name}`,
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Get all employees in a specific department
export async function getDepartmentEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id: departmentId } = req.params;

    const employees = await Employee.find({ organizationId, departmentId })
      .populate('designationId', 'title')
      .sort({ firstName: 1 });

    res.status(200).json({ success: true, data: employees });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

