/**
 * Permission helper functions for role-based access control
 * Used throughout the application to conditionally render UI elements
 */

export type UserRole = 'admin' | 'staff' | 'organizer' | 'client';
export type Resource = 'dashboard' | 'reports' | 'events' | 'event_builder' | 'bookings' | 'packages' | 'venues' | 'clients' | 'organizers' | 'suppliers' | 'staff' | 'payments' | 'activity_logs';

/**
 * Permission matrix defining what each role can do with each resource
 */
const PERMISSIONS: Record<UserRole, Record<Resource, string[]>> = {
  admin: {
    dashboard: ['view', 'create', 'edit', 'delete'],
    reports: ['view', 'create', 'edit', 'delete', 'export'],
    events: ['view', 'create', 'edit', 'delete'],
    event_builder: ['view', 'create', 'edit', 'delete'],
    bookings: ['view', 'create', 'edit', 'delete'],
    packages: ['view', 'create', 'edit', 'delete'],
    venues: ['view', 'create', 'edit', 'delete'],
    clients: ['view', 'create', 'edit', 'delete'],
    organizers: ['view', 'create', 'edit', 'delete'],
    suppliers: ['view', 'create', 'edit', 'delete'],
    staff: ['view', 'create', 'edit', 'delete'],
    payments: ['view', 'create', 'edit', 'delete'],
    activity_logs: ['view'],
  },
  staff: {
    dashboard: ['view'],
    reports: [], // No access to reports
    events: ['view', 'edit'], // Can view and update, but not create/delete
    event_builder: ['edit'], // Can only edit existing events
    bookings: ['view', 'create', 'edit', 'verify_payment'],
    packages: ['view'], // View only
    venues: ['view'], // View only
    clients: ['view', 'create', 'edit'], // Can create and edit, but not delete
    organizers: ['view'], // View only
    suppliers: ['view'], // View only
    staff: [], // No access to staff management
    payments: ['view', 'create', 'verify'], // Can record and verify, but not delete
    activity_logs: [], // No access to activity logs
  },
  organizer: {
    dashboard: ['view'],
    reports: [],
    events: ['view'],
    event_builder: [],
    bookings: ['view'],
    packages: ['view'],
    venues: ['view'],
    clients: ['view'],
    organizers: ['view'],
    suppliers: ['view'],
    staff: [],
    payments: ['view'],
    activity_logs: [],
  },
  client: {
    dashboard: ['view'],
    reports: [],
    events: ['view'],
    event_builder: [],
    bookings: ['view', 'create'],
    packages: ['view'],
    venues: ['view'],
    clients: ['view'],
    organizers: ['view'],
    suppliers: ['view'],
    staff: [],
    payments: ['view'],
    activity_logs: [],
  },
};

/**
 * Check if a user role can perform a specific action on a resource
 */
export const hasPermission = (role: UserRole, resource: Resource, action: string): boolean => {
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions || !rolePermissions[resource]) {
    return false;
  }
  return rolePermissions[resource].includes(action);
};

/**
 * Check if user can view a resource
 */
export const canView = (resource: Resource, role: UserRole): boolean => {
  return hasPermission(role, resource, 'view');
};

/**
 * Check if user can create a resource
 */
export const canCreate = (resource: Resource, role: UserRole): boolean => {
  return hasPermission(role, resource, 'create');
};

/**
 * Check if user can edit a resource
 */
export const canEdit = (resource: Resource, role: UserRole): boolean => {
  return hasPermission(role, resource, 'edit');
};

/**
 * Check if user can delete a resource
 */
export const canDelete = (resource: Resource, role: UserRole): boolean => {
  return hasPermission(role, resource, 'delete');
};

/**
 * Check if user can export a resource (mainly for reports)
 */
export const canExport = (resource: Resource, role: UserRole): boolean => {
  return hasPermission(role, resource, 'export');
};

/**
 * Check if user can verify payments
 */
export const canVerifyPayment = (role: UserRole): boolean => {
  return hasPermission(role, 'payments', 'verify_payment') || hasPermission(role, 'payments', 'verify');
};

/**
 * Get all permissions for a role and resource
 */
export const getPermissions = (role: UserRole, resource: Resource): string[] => {
  return PERMISSIONS[role]?.[resource] || [];
};

/**
 * Check if user has any access to a resource
 */
export const hasAnyAccess = (resource: Resource, role: UserRole): boolean => {
  const permissions = getPermissions(role, resource);
  return permissions.length > 0;
};

/**
 * Get user role from user object (handles different case formats)
 */
export const getUserRole = (user: any): UserRole => {
  if (!user || !user.user_role) return 'client';

  const role = user.user_role.toLowerCase();
  if (role === 'admin') return 'admin';
  if (role === 'staff') return 'staff';
  if (role === 'organizer' || role === 'vendor') return 'organizer';
  if (role === 'client') return 'client';

  return 'client'; // Default fallback
};

/**
 * Check if user is admin
 */
export const isAdmin = (user: any): boolean => {
  return getUserRole(user) === 'admin';
};

/**
 * Check if user is staff
 */
export const isStaff = (user: any): boolean => {
  return getUserRole(user) === 'staff';
};

/**
 * Check if user is organizer
 */
export const isOrganizer = (user: any): boolean => {
  return getUserRole(user) === 'organizer';
};

/**
 * Check if user is client
 */
export const isClient = (user: any): boolean => {
  return getUserRole(user) === 'client';
};
