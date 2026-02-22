import type { StoreMember, User } from "../../database/schema/index.js";

export type AuthenticatedStoreMembership = StoreMember;

export type AuthenticatedUser = User & {
  storeMemberships: AuthenticatedStoreMembership[];
};
