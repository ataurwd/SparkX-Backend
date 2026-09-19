import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Organization } from '../../models/Organization';
import { User } from '../../models/User';
import { Role } from '../../models/Role';
import { RefreshToken } from '../../models/RefreshToken';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken
} from '../../utils/token.service';
import { seedOrganizationRoles } from '../../utils/roles.seed';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { organizationName, firstName, lastName, email, password } = req.body;

    if (!organizationName || !firstName || !lastName || !email || !password) {
      res.status(400).json({ success: false, error: 'All fields are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      return;
    }

    // Generate unique slug
    let baseSlug = slugify(organizationName);
    let slug = baseSlug;
    let counter = 1;
    while (await Organization.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // 1. Create Organization
    const organization = await Organization.create({
      name: organizationName,
      slug,
      currency: 'USD',
      timezone: 'UTC',
      isActive: true
    });

    // 2. Seed default roles for this tenant
    await seedOrganizationRoles(organization._id as mongoose.Types.ObjectId);
    const ownerRole = await Role.findOne({ organizationId: organization._id, name: 'Owner' });

    // 3. Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create User as Owner
    const user = await User.create({
      organizationId: organization._id,
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName,
      lastName,
      role: 'Owner',
      roleId: ownerRole?._id,
      isEmailVerified: true,
      status: 'active'
    });

    // 5. Generate Dual Tokens
    const { token: rawRefreshToken, tokenHash, expiresAt } = generateRefreshToken(user._id.toString());
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      email: user.email,
      role: user.role,
      permissions: ownerRole?.permissions || ['*']
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: ownerRole?.permissions || ['*']
        },
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug
        },
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken
        }
      }
    });
  } catch (error: any) {
    console.error('[Auth Register Error]:', error);
    res.status(500).json({ success: false, error: error.message || 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, organizationSlug } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Query user
    let query: any = { email: cleanEmail };
    if (organizationSlug) {
      const org = await Organization.findOne({ slug: organizationSlug });
      if (org) {
        query.organizationId = org._id;
      }
    }

    const user = await User.findOne(query);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ success: false, error: 'Please log in with Google OAuth' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const organization = await Organization.findById(user.organizationId);
    if (!organization || !organization.isActive) {
      res.status(403).json({ success: false, error: 'Organization workspace is suspended or inactive' });
      return;
    }

    // Fetch Role Permissions
    let permissions: string[] = ['*'];
    if (user.roleId) {
      const role = await Role.findById(user.roleId);
      if (role) permissions = role.permissions;
    }

    // Generate Tokens
    const { token: rawRefreshToken, tokenHash, expiresAt } = generateRefreshToken(user._id.toString());
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      organizationId: organization._id.toString(),
      email: user.email,
      role: user.role,
      permissions
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          permissions
        },
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug
        },
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken
        }
      }
    });
  } catch (error: any) {
    console.error('[Auth Login Error]:', error);
    res.status(500).json({ success: false, error: error.message || 'Login failed' });
  }
}

export async function quickLogin(req: Request, res: Response): Promise<void> {
  try {
    const { role: requestedRole } = req.body;

    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'SparkX Global Tech',
        slug: 'sparkx-global',
        contactEmail: 'admin@sparkx.io',
        currency: 'USD',
        timezone: 'UTC',
        isActive: true
      });
    }

    const demoProfiles: Record<string, any> = {
      owner: {
        email: 'owner@sparkx.io',
        firstName: 'Ataur',
        lastName: 'Rahman',
        role: 'Owner',
        permissions: ['*'],
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      },
      hr: {
        email: 'hr@sparkx.io',
        firstName: 'Alex',
        lastName: 'Morgan',
        role: 'HR Admin',
        permissions: ['*'],
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100'
      },
      manager: {
        email: 'manager@sparkx.io',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        role: 'Department Manager',
        permissions: ['team:*', 'employee:read', 'attendance:*', 'leave:*', 'task:*', 'performance:*'],
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'
      },
      employee: {
        email: 'employee@sparkx.io',
        firstName: 'Karim',
        lastName: 'Ahmed',
        role: 'Employee',
        permissions: ['employee:read', 'attendance:self', 'leave:self', 'task:self', 'payroll:self'],
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
      }
    };

    const target = demoProfiles[requestedRole] || demoProfiles.owner;

    let user = await User.findOne({ email: target.email });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);

      user = await User.create({
        organizationId: org._id,
        email: target.email,
        passwordHash,
        firstName: target.firstName,
        lastName: target.lastName,
        role: target.role,
        avatarUrl: target.avatarUrl,
        isEmailVerified: true,
        status: 'active'
      });
    }

    const { token: rawRefreshToken, tokenHash, expiresAt } = generateRefreshToken(user._id.toString());
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      organizationId: org._id.toString(),
      email: user.email,
      role: user.role,
      permissions: target.permissions
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          permissions: target.permissions
        },
        organization: {
          id: org._id,
          name: org.name,
          slug: org.slug
        },
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken
        }
      }
    });
  } catch (error: any) {
    console.error('[Quick Login Error]:', error);
    res.status(500).json({ success: false, error: error.message || 'Quick login failed' });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, error: 'Refresh token is required' });
      return;
    }

    const tokenHash = hashRefreshToken(token);
    const existing = await RefreshToken.findOne({ tokenHash, revoked: false });

    if (!existing || new Date() > existing.expiresAt) {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
      return;
    }

    // Revoke old token (Token Rotation)
    existing.revoked = true;
    await existing.save();

    const user = await User.findById(existing.userId);
    if (!user || user.status !== 'active') {
      res.status(401).json({ success: false, error: 'User is not active' });
      return;
    }

    // Fetch Role Permissions
    let permissions: string[] = ['*'];
    if (user.roleId) {
      const role = await Role.findById(user.roleId);
      if (role) permissions = role.permissions;
    }

    // Generate new pair
    const { token: newRawRefreshToken, tokenHash: newHash, expiresAt } = generateRefreshToken(user._id.toString());
    await RefreshToken.create({
      userId: user._id,
      tokenHash: newHash,
      expiresAt
    });

    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      email: user.email,
      role: user.role,
      permissions
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Token refresh failed' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      const tokenHash = hashRefreshToken(token);
      await RefreshToken.updateOne({ tokenHash }, { revoked: true });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const organization = await Organization.findById(user.organizationId);

    let permissions: string[] = ['*'];
    if (user.roleId) {
      const role = await Role.findById(user.roleId);
      if (role) permissions = role.permissions;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          permissions
        },
        organization: {
          id: organization?._id,
          name: organization?.name,
          slug: organization?.slug,
          currency: organization?.currency
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const { email, googleId, firstName, lastName, avatarUrl, organizationName } = req.body;

    if (!email || !googleId) {
      res.status(400).json({ success: false, error: 'Google authentication data required' });
      return;
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    let organization;

    if (!user) {
      // Create new tenant organization if registering via Google
      const orgName = organizationName || `${firstName}'s Workspace`;
      const baseSlug = slugify(orgName);
      let slug = baseSlug;
      let counter = 1;
      while (await Organization.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }

      organization = await Organization.create({
        name: orgName,
        slug,
        isActive: true
      });

      await seedOrganizationRoles(organization._id as mongoose.Types.ObjectId);
      const ownerRole = await Role.findOne({ organizationId: organization._id, name: 'Owner' });

      user = await User.create({
        organizationId: organization._id,
        email: email.toLowerCase().trim(),
        firstName: firstName || 'User',
        lastName: lastName || '',
        avatarUrl,
        googleId,
        role: 'Owner',
        roleId: ownerRole?._id,
        isEmailVerified: true,
        status: 'active'
      });
    } else {
      organization = await Organization.findById(user.organizationId);
      if (!user.googleId) {
        user.googleId = googleId;
        if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl;
        await user.save();
      }
    }

    let permissions: string[] = ['*'];
    if (user.roleId) {
      const role = await Role.findById(user.roleId);
      if (role) permissions = role.permissions;
    }

    const { token: rawRefreshToken, tokenHash, expiresAt } = generateRefreshToken(user._id.toString());
    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      email: user.email,
      role: user.role,
      permissions
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          permissions
        },
        organization: {
          id: organization?._id,
          name: organization?.name,
          slug: organization?.slug
        },
        tokens: {
          accessToken,
          refreshToken: rawRefreshToken
        }
      }
    });
  } catch (error: any) {
    console.error('[Google OAuth Error]:', error);
    res.status(500).json({ success: false, error: error.message || 'Google authentication failed' });
  }
}
