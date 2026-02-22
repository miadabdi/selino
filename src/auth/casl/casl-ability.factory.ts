import {
  AbilityBuilder,
  AnyMongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Injectable } from "@nestjs/common";
import { MANAGING_STORE_MEMBER_ROLES } from "../../database/index.js";
import type { AuthenticatedUser } from "../interfaces/index.js";
import { Action } from "./actions.enum.js";

export type AppAbility = AnyMongoAbility;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AuthenticatedUser) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    const managedStoreIds = user.storeMemberships
      .filter((membership) =>
        MANAGING_STORE_MEMBER_ROLES.includes(membership.role),
      )
      .map((membership) => membership.storeId)
      .filter((storeId, index, all) => all.indexOf(storeId) === index);

    const hasManagingRoleInAnyStore = managedStoreIds.length > 0;
    const isAdmin = user.isAdmin === true;

    if (isAdmin) {
      can(Action.Manage, "all");
      return build();
    }

    if (hasManagingRoleInAnyStore) {
      can(Action.Create, "Brand");
      can(Action.Create, "Product");
      can(Action.Update, "Product");
    }

    if (managedStoreIds.length > 0) {
      can(Action.Create, "Inventory", { storeId: { $in: managedStoreIds } });
      can(Action.Update, "Inventory", { storeId: { $in: managedStoreIds } });
    }

    can(Action.Update, "PurchaseRequest", { requesterId: user.id });

    return build();
  }
}
