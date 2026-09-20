import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Middleware ensuring user has at least one of the specified permissions,
 * or is an 'Owner' / 'Super Admin' with full administrative bypass.
 */
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Owner and Super Admin have global bypass
    if (req.user.role === 'Owner' || req.user.role === 'Super Admin') {
      return next();
    }

    // Essential self-service operations inherently granted to all authenticated staff:
    const selfServicePermissions = [
      'leave.apply',
      'leave.read',
      'attendance.checkin',
      'tasks.read',
      'tasks.update_status',
      'goals.read',
      'payslip.view_own',
      'chat.participate',
      'calendar.view'
    ];
    if (selfServicePermissions.includes(permission)) {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    if (userPermissions.includes(permission) || userPermissions.includes('*')) {
      return next();
    }

    // Check category prefix / aliases (e.g. 'leave:*', 'leave.*', 'leave:self', 'attendance:self')
    const prefix = permission.split('.')[0];
    const hasAlias = userPermissions.some((p: string) => {
      if (p === '*' || p === permission) return true;
      if (p === `${prefix}:*` || p === `${prefix}.*` || p === `${prefix}:self` || p === `${prefix}.self`) {
        return true;
      }
      return false;
    });

    if (hasAlias) {
      return next();
    }

    res.status(403).json({
      success: false,
      error: `Access forbidden: Missing required permission '${permission}'`
    });
  };
}

/**
 * Middleware ensuring user has one of the specified roles
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role === 'Owner' || req.user.role === 'Super Admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({
      success: false,
      error: `Access forbidden: Role '${req.user.role}' is not authorized`
    });
  };
}
