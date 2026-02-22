import type { StoreMember, User } from "../../database/schema/index";

export type AuthenticatedStoreMembership = StoreMember;

export type AuthenticatedUser = User & {
  storeMemberships: AuthenticatedStoreMembership[];
};
