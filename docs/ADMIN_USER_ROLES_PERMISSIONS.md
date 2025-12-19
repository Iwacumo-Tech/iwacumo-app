# AdminUser Roles and Permissions Management Guide

## Overview

`AdminUser` is designed for **staff members of organizations (Tenants)** who need administrative access. Unlike regular `User` accounts (which use the `Claim` model), `AdminUser` uses the `AdminUserRole` model for role management.

**Key Relationships:**
- **AdminUser → Tenant**: AdminUser primarily belongs to a Tenant/Organization (required)
- **AdminUserRole → Tenant**: AdminUserRole belongs to a Tenant (required, ensures role assignments are tenant-scoped)
- **AdminUserRole → Publisher**: Roles can be scoped to specific Publishers within that Tenant (optional, for publisher-specific permissions)

## Architecture

### Data Flow

```
AdminUser
  └── AdminUserRole (can be scoped to publisher_id)
       └── Role
            └── PermissionRole
                 └── Permission
```

### Key Differences from Regular Users

| Aspect | Regular User | AdminUser |
|--------|-------------|-----------|
| Role Assignment | `Claim` model | `AdminUserRole` model |
| Organization | Via `tenantMember` relation | Via `tenant_id` (required) |
| Publisher Scope | Via `tenant_slug` in Claim | Via `publisher_id` in AdminUserRole (optional) |
| Model | `User` | `AdminUser` (separate table) |
| Use Case | Authors, Publishers, Customers | Staff members of organizations/tenants |

## Schema Structure

### AdminUser Model
```prisma
model AdminUser {
  id            String            @id @default(uuid())
  tenant_id     String            // Required: AdminUser belongs to a Tenant/Organization
  tenant        Tenant            @relation(...)
  email         String            @unique
  password_hash String?
  first_name    String?
  last_name     String?
  status        String            @default("invited") // invited, active, suspended, archived
  last_login_at DateTime?
  roles         AdminUserRole[]
  transactions  TransactionHistory[]
  created_at    DateTime          @default(now())
  updated_at    DateTime          @updatedAt
}
```

### AdminUserRole Model
```prisma
model AdminUserRole {
  id            String    @id @default(uuid())
  admin_user_id String
  tenant_id     String    // Required: AdminUserRole belongs to a Tenant
  role_name     String
  publisher_id  String?   // Optional: scopes role to specific publisher within tenant
  expires_at    DateTime? // Optional: role expiration
  admin_user    AdminUser @relation(...)
  tenant        Tenant    @relation(...)
  role          Role      @relation(...)
  publisher     Publisher? @relation(...)
  
  @@unique([admin_user_id, role_name, publisher_id, tenant_id])
}
```

## Usage Examples

### 1. Create an AdminUser

```typescript
// Via tRPC
const adminUser = await trpc.createAdminUser.mutate({
  email: "staff@example.com",
  password: "securepassword123",
  first_name: "John",
  last_name: "Doe",
  tenant_id: "tenant-uuid", // Required: AdminUser belongs to a Tenant/Organization
  status: "active",
});
```

### 2. Assign a Role to AdminUser

```typescript
// Assign a tenant-scoped role (no publisher)
await trpc.assignRoleToAdminUser.mutate({
  admin_user_id: "admin-uuid",
  tenant_id: "tenant-uuid", // Required: role belongs to this tenant
  role_name: "Content Manager",
});

// Assign a publisher-scoped role within a tenant
await trpc.assignRoleToAdminUser.mutate({
  admin_user_id: "admin-uuid",
  tenant_id: "tenant-uuid", // Required: role belongs to this tenant
  role_name: "Editor",
  publisher_id: "publisher-uuid", // Optional: role only applies to this publisher within tenant
});

// Assign a role with expiration
await trpc.assignRoleToAdminUser.mutate({
  admin_user_id: "admin-uuid",
  tenant_id: "tenant-uuid", // Required
  role_name: "Temporary Admin",
  expires_at: new Date("2024-12-31"),
});
```

### 3. Check Permissions

```typescript
import { hasAdminPermission, hasAdminRole, getAdminUserPermissions } from "@/server/module/admin";

// Check if admin has a specific permission
const canEditBooks = await hasAdminPermission(
  adminUserId,
  "edit_books",
  "books",
  "edit",
  tenantId, // Optional: check within tenant scope
  publisherId // Optional: check within publisher scope
);

// Check if admin has a specific role
const isEditor = await hasAdminRole(
  adminUserId,
  "Editor",
  tenantId, // Optional: check within tenant scope
  publisherId // Optional: check within publisher scope
);

// Get all permissions and roles
const { permissions, roles } = await getAdminUserPermissions(
  adminUserId,
  tenantId, // Optional: filter by tenant
  publisherId // Optional: filter by publisher
);
```

### 4. Remove a Role

```typescript
await trpc.removeRoleFromAdminUser.mutate({
  admin_user_id: "admin-uuid",
  tenant_id: "tenant-uuid", // Required: identifies the tenant-scoped role assignment
  role_name: "Editor",
  publisher_id: "publisher-uuid", // Optional: required if role was publisher-scoped
});
```

## Tenant and Publisher-Scoped Roles

Roles are **tenant-scoped** (required) and can optionally be **publisher-scoped** within that tenant:

```typescript
// AdminUser has "Editor" role for Publisher A within Tenant X
await assignRoleToAdminUser({
  admin_user_id: "admin-1",
  tenant_id: "tenant-x", // Required: role belongs to this tenant
  role_name: "Editor",
  publisher_id: "publisher-a", // Optional: scoped to specific publisher
});

// Same AdminUser has "Editor" role for Publisher B within same Tenant X
await assignRoleToAdminUser({
  admin_user_id: "admin-1",
  tenant_id: "tenant-x", // Same tenant
  role_name: "Editor",
  publisher_id: "publisher-b", // Different publisher
});

// AdminUser has "Admin" role for Tenant X (no publisher_id = tenant-wide role)
await assignRoleToAdminUser({
  admin_user_id: "admin-1",
  tenant_id: "tenant-x", // Required
  role_name: "Super Admin",
  // No publisher_id = tenant-wide role
});
```

**Important:** All role assignments are tenant-scoped. The `publisher_id` is optional and only scopes the role to a specific publisher within that tenant.

## Permission Checking in Your Code

### Example: Protect a Route

```typescript
import { hasAdminPermission } from "@/server/module/admin";

export const updateBook = publicProcedure
  .input(updateBookSchema)
  .mutation(async (opts) => {
    const session = await auth();
    
    if (!session?.adminUserId) {
      throw new Error("Unauthorized");
    }

    // Check permission (tenant_id should come from the book's publisher's tenant)
    const book = await prisma.book.findUnique({
      where: { id: opts.input.id },
      include: { publisher: true },
    });

    const canEdit = await hasAdminPermission(
      session.adminUserId,
      "edit_books",
      "books",
      "edit",
      book?.publisher?.tenant_id, // Tenant scope
      opts.input.publisher_id // Publisher scope
    );

    if (!canEdit) {
      throw new Error("Insufficient permissions");
    }

    // Proceed with update
    return await prisma.book.update({...});
  });
```

### Example: Middleware for Permission Checking

```typescript
async function requireAdminPermission(
  adminUserId: string,
  permissionName: string,
  module: string,
  action: string,
  publisherId?: string
) {
  const hasPermission = await hasAdminPermission(
    adminUserId,
    permissionName,
    module,
    action,
    publisherId
  );

  if (!hasPermission) {
    throw new Error(`Missing permission: ${permissionName}`);
  }
}

// Usage
export const deleteBook = publicProcedure
  .input(deleteBookSchema)
  .mutation(async (opts) => {
    await requireAdminPermission(
      session.adminUserId,
      "delete_books",
      "books",
      "delete",
      book.publisher?.tenant_id, // Tenant scope
      book.publisher_id // Publisher scope
    );
    
    // Proceed with deletion
  });
```

## Role Expiration

Roles can have expiration dates:

```typescript
await assignRoleToAdminUser({
  admin_user_id: "admin-uuid",
  role_name: "Temporary Access",
  expires_at: new Date("2024-12-31"), // Role expires on this date
});
```

Expired roles are automatically excluded when checking permissions via `getAdminUserPermissions()`.

## Available API Endpoints

All endpoints are available via tRPC:

- `createAdminUser` - Create a new admin user
- `updateAdminUser` - Update admin user details
- `assignRoleToAdminUser` - Assign a role to an admin user
- `removeRoleFromAdminUser` - Remove a role from an admin user
- `getAllAdminUsers` - Get all admin users with their roles
- `getAdminUserById` - Get a specific admin user with roles and permissions
- `deleteAdminUser` - Delete an admin user
- `getAdminRoles` - Get all available roles for assignment

## Best Practices

1. **Always check permissions** before allowing actions
2. **Use publisher-scoped roles** when admins work for multiple publishers
3. **Set expiration dates** for temporary access
4. **Validate role assignments** - ensure roles exist before assigning
5. **Use status field** to manage admin user lifecycle (invited → active → suspended → archived)
6. **Hash passwords** - always use bcrypt (already handled in create/update functions)

## Common Patterns

### Pattern 1: Organization Staff Member
```typescript
// Create admin user for a tenant/organization
const staff = await createAdminUser({
  email: "staff@organization.com",
  password: "password",
  tenant_id: "tenant-uuid", // Required: belongs to organization
  status: "active",
});

// Assign tenant-wide role
await assignRoleToAdminUser({
  admin_user_id: staff.id,
  tenant_id: "tenant-uuid", // Required: role belongs to tenant
  role_name: "Content Manager",
  // No publisher_id = tenant-wide role
});

// Assign publisher-specific role (within that tenant)
await assignRoleToAdminUser({
  admin_user_id: staff.id,
  tenant_id: "tenant-uuid", // Required: same tenant
  role_name: "Publisher Staff",
  publisher_id: "publisher-uuid", // Optional: scope to specific publisher
});
```

### Pattern 2: Multi-Publisher Admin (within same tenant)
```typescript
// Admin works for multiple publishers within the same tenant
await assignRoleToAdminUser({
  admin_user_id: "admin-uuid",
  tenant_id: "tenant-x", // Required: same tenant
  role_name: "Editor",
  publisher_id: "publisher-a", // Different publisher
});

await assignRoleToAdminUser({
  admin_user_id: "admin-uuid",
  tenant_id: "tenant-x", // Same tenant
  role_name: "Editor",
  publisher_id: "publisher-b", // Different publisher
});
```

### Pattern 3: Tenant-Wide Admin
```typescript
// Admin has tenant-wide access (no publisher_id)
await assignRoleToAdminUser({
  admin_user_id: "admin-uuid",
  tenant_id: "tenant-uuid", // Required
  role_name: "Super Admin",
  // No publisher_id = tenant-wide role
});
```

## Troubleshooting

### Issue: Permission check returns false
- Verify the role is assigned: `getAdminUserById()`
- Check if role has expired: `expires_at` field
- Ensure publisher_id matches if role is publisher-scoped
- Verify the permission exists in the Role's PermissionRole entries

### Issue: Cannot assign role
- Check if role already exists (unique constraint)
- Verify role name exists in Role table
- Ensure admin_user_id is valid

### Issue: Roles not showing permissions
- Check if PermissionRole records exist for the Role
- Verify PermissionRole.active is true
- Ensure Permission.active is true

