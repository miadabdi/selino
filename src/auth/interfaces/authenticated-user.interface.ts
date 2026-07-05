import type { User } from "../../database/schema/index";

export type BusinessRole = "manager" | "seller" | "collector" | "admin" | null;

export type AuthenticatedBusinessMembership = {
  id: number;
  businessAccountId: number;
  businessName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
};

export type AuthenticatedUser = User & {
  profilePictureUrl: string | null;
  role: BusinessRole;
  permissions: string[];
  businessMemberships: AuthenticatedBusinessMembership[];
};
