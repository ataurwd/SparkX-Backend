import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { Employee } from '../../models/Employee';
import { EmployeeDocument } from '../../models/EmployeeDocument';
import { User } from '../../models/User';
import { Role } from '../../models/Role';
import { Department } from '../../models/Department';
import { Designation } from '../../models/Designation';
import { Organization } from '../../models/Organization';
import { uploadToImgBB } from '../../utils/imgbb.service';

export async function getEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let organizationId = req.user?.organizationId;
    if (!organizationId) {
      const org = await Organization.findOne();
      organizationId = org?._id?.toString();
    }
    const {
      search,
      departmentId,
      status,
      employmentType,
      workLocation,
      page = 1,
      limit = 10
    } = req.query;

    const query: any = { organizationId };

    if (departmentId) query.departmentId = departmentId;
    if (status) query.employmentStatus = status;
    if (employmentType) query.employmentType = employmentType;
    if (workLocation) query.workLocation = workLocation;

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { employeeCode: searchRegex }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [employees, total] = await Promise.all([
      Employee.find(query)
        .populate('departmentId', 'name color code')
        .populate('designationId', 'title level')
        .populate('teamId', 'name')
        .populate('managerId', 'firstName lastName email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Employee.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getEmployeeById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id } = req.params;

    const employee = await Employee.findOne({ _id: id, organizationId })
      .populate('departmentId', 'name color code')
      .populate('designationId', 'title level')
      .populate('teamId', 'name')
      .populate('managerId', 'firstName lastName email avatarUrl employeeCode');

    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    const documentsCount = await EmployeeDocument.countDocuments({ organizationId, employeeId: employee._id });

    res.status(200).json({
      success: true,
      data: {
        ...employee.toObject(),
        documentsCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const {
      firstName,
      lastName,
      email,
      phone,
      employeeCode,
      departmentId,
      designationId,
      teamId,
      managerId,
      joiningDate,
      employmentType,
      employmentStatus,
      workLocation,
      salary,
      emergencyContact,
      address,
      avatarUrl
    } = req.body;

    if (!firstName || !lastName || !email) {
      res.status(400).json({ success: false, error: 'First name, last name, and email are required' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Auto-generate employee code if missing
    let code = employeeCode ? employeeCode.trim().toUpperCase() : '';
    if (!code) {
      const count = await Employee.countDocuments({ organizationId });
      code = `SPX-${String(count + 1).padStart(4, '0')}`;
    }

    const existingCode = await Employee.findOne({ organizationId, employeeCode: code });
    if (existingCode) {
      res.status(400).json({ success: false, error: `Employee code '${code}' already exists` });
      return;
    }

    // Resolve role if provided
    let assignedRoleName = req.body.role || 'Employee';
    let assignedRoleId = req.body.roleId;
    if (assignedRoleId && !req.body.role) {
      const foundRole = await Role.findOne({ _id: assignedRoleId, organizationId });
      if (foundRole) assignedRoleName = foundRole.name;
    } else if (assignedRoleName && !assignedRoleId) {
      const foundRole = await Role.findOne({ name: assignedRoleName, organizationId });
      if (foundRole) assignedRoleId = foundRole._id;
    }

    // Check if user already exists or provision user account
    let user = await User.findOne({ organizationId, email: cleanEmail });
    if (!user) {
      user = await User.create({
        organizationId,
        email: cleanEmail,
        firstName,
        lastName,
        role: assignedRoleName,
        roleId: assignedRoleId,
        avatarUrl,
        status: 'active',
        isEmailVerified: false
      });
    } else {
      // Update existing user's role if provided
      await User.updateOne(
        { _id: user._id },
        {
          role: assignedRoleName,
          roleId: assignedRoleId
        }
      );
    }

    // Resolve departmentId if department string name was sent
    let finalDeptId = departmentId;
    if (!finalDeptId && req.body.department) {
      const dept = await Department.findOne({
        organizationId,
        $or: [{ name: req.body.department }, { code: req.body.department }]
      });
      if (dept) finalDeptId = dept._id;
    }

    const employee = await Employee.create({
      organizationId,
      userId: user._id,
      employeeCode: code,
      firstName,
      lastName,
      email: cleanEmail,
      phone,
      avatarUrl: avatarUrl || user.avatarUrl,
      role: assignedRoleName,
      roleId: assignedRoleId,
      departmentId: finalDeptId || undefined,
      designationId: designationId || undefined,
      teamId: teamId || undefined,
      managerId: managerId || undefined,
      joiningDate: joiningDate || new Date(),
      employmentType: employmentType || 'full_time',
      employmentStatus: employmentStatus || 'active',
      workLocation: workLocation || 'office',
      salary: salary || { base: 0, currency: 'USD' },
      emergencyContact,
      address
    });

    const populated = await Employee.findById(employee._id)
      .populate('departmentId', 'name color code')
      .populate('designationId', 'title level')
      .populate('teamId', 'name')
      .populate('managerId', 'firstName lastName email avatarUrl employeeCode');

    res.status(201).json({ success: true, data: populated || employee });
  } catch (error: any) {
    console.error('[Create Employee Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id } = req.params;
    const updateData: any = { ...req.body };

    // Resolve departmentId if department string was provided
    if (!updateData.departmentId && updateData.department) {
      const dept = await Department.findOne({
        organizationId,
        $or: [{ name: updateData.department }, { code: updateData.department }]
      });
      if (dept) {
        updateData.departmentId = dept._id;
      }
    }

    // Resolve role if role name was provided
    if (updateData.role && !updateData.roleId) {
      const roleDoc = await Role.findOne({ organizationId, name: updateData.role });
      if (roleDoc) {
        updateData.roleId = roleDoc._id;
      }
    } else if (updateData.roleId && !updateData.role) {
      const roleDoc = await Role.findOne({ organizationId, _id: updateData.roleId });
      if (roleDoc) {
        updateData.role = roleDoc.name;
      }
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: updateData },
      { new: true }
    )
      .populate('departmentId', 'name color code')
      .populate('designationId', 'title level')
      .populate('teamId', 'name')
      .populate('managerId', 'firstName lastName email avatarUrl employeeCode');

    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    // Keep associated user in sync
    if (employee.userId) {
      const userUpdate: any = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        avatarUrl: employee.avatarUrl
      };
      if (employee.role) userUpdate.role = employee.role;
      if (employee.roleId) userUpdate.roleId = employee.roleId;

      await User.updateOne(
        { _id: employee.userId },
        { $set: userUpdate }
      );
    }

    res.status(200).json({ success: true, data: employee });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id } = req.params;

    // Soft delete by setting status to 'terminated'
    const employee = await Employee.findOneAndUpdate(
      { _id: id, organizationId },
      { employmentStatus: 'terminated' },
      { new: true }
    );

    if (!employee) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    if (employee.userId) {
      await User.updateOne({ _id: employee.userId }, { status: 'suspended' });
    }

    res.status(200).json({ success: true, message: 'Employee terminated successfully', data: employee });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- EMPLOYEE DOCUMENTS ---
export async function getEmployeeDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id } = req.params;

    const documents = await EmployeeDocument.find({ organizationId, employeeId: id })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: documents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function uploadEmployeeDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { id } = req.params;
    const { title, category, fileData, fileUrl, mimeType, fileSizeBytes, isConfidential } = req.body;

    if (!title || !category) {
      res.status(400).json({ success: false, error: 'Document title and category are required' });
      return;
    }

    let finalUrl = fileUrl;

    // If base64 fileData is provided, upload directly to ImgBB
    if (fileData) {
      const uploadRes = await uploadToImgBB(fileData, `${title}_${category}`);
      finalUrl = uploadRes.url;
    }

    if (!finalUrl) {
      res.status(400).json({ success: false, error: 'File data or valid URL is required' });
      return;
    }

    const doc = await EmployeeDocument.create({
      organizationId,
      employeeId: id,
      title,
      category,
      fileUrl: finalUrl,
      fileSizeBytes: fileSizeBytes || 1024,
      mimeType: mimeType || 'image/png',
      isConfidential: isConfidential !== undefined ? isConfidential : true,
      uploadedBy: req.user!.userId
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error: any) {
    console.error('[Upload Document Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteEmployeeDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const organizationId = req.user!.organizationId;
    const { docId } = req.params;

    const doc = await EmployeeDocument.findOneAndDelete({ _id: docId, organizationId });
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
