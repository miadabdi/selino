import { ForbiddenException } from "@nestjs/common";
import type {
  AuthenticatedBusinessMembership,
  AuthenticatedUser,
} from "../interfaces/index";

export type PermissionScope = {
  mode: "own" | "all";
  userId: number;
  businessAccountId?: number;
};

export function hasPermission(
  user: AuthenticatedUser,
  permission: string,
): boolean {
  return (
    user.isAdmin === true ||
    user.permissions.includes("*") ||
    user.permissions.includes(permission)
  );
}

export function findMembershipWithPermission(
  user: AuthenticatedUser,
  permission: string,
  businessAccountId?: number,
): AuthenticatedBusinessMembership | undefined {
  if (user.isAdmin === true || user.permissions.includes("*")) {
    return user.businessMemberships.find(
      (membership) =>
        membership.isActive &&
        (businessAccountId == null ||
          membership.businessAccountId === businessAccountId),
    );
  }

  return user.businessMemberships.find(
    (membership) =>
      membership.isActive &&
      membership.permissions.includes(permission) &&
      (businessAccountId == null ||
        membership.businessAccountId === businessAccountId),
  );
}

export function assertBusinessPermission(
  user: AuthenticatedUser,
  businessAccountId: number,
  permission: string,
): void {
  if (
    user.isAdmin === true ||
    user.permissions.includes("*") ||
    findMembershipWithPermission(user, permission, businessAccountId)
  ) {
    return;
  }

  throw new ForbiddenException("You do not have permission for this action");
}

export function resolveBusinessAccountIdForPermission(
  user: AuthenticatedUser,
  permission: string,
): number | null {
  const membership = findMembershipWithPermission(user, permission);

  if (membership) {
    return membership.businessAccountId;
  }

  if (user.isAdmin === true || user.permissions.includes("*")) {
    return (
      user.businessMemberships.find((item) => item.isActive === true)
        ?.businessAccountId ?? null
    );
  }

  throw new ForbiddenException("You do not have permission for this action");
}

export function resolveOwnAllScope(
  user: AuthenticatedUser,
  ownPermission: string,
  allPermission: string,
): PermissionScope {
  const allMembership = findMembershipWithPermission(user, allPermission);
  if (user.isAdmin === true || user.permissions.includes("*")) {
    return {
      mode: "all",
      userId: user.id,
      businessAccountId: allMembership?.businessAccountId,
    };
  }

  if (allMembership) {
    return {
      mode: "all",
      userId: user.id,
      businessAccountId: allMembership.businessAccountId,
    };
  }

  if (hasPermission(user, ownPermission)) {
    return { mode: "own", userId: user.id };
  }

  throw new ForbiddenException("You do not have permission for this action");
}

export function withIsOwn<T extends { requesterId?: number; buyerId?: number }>(
  record: T,
  userId: number,
) {
  const ownerId = record.requesterId ?? record.buyerId;
  return { ...record, isOwn: ownerId === userId };
}
