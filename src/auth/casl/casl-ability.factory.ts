import {
  AbilityBuilder,
  AnyMongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../interfaces/index";
import { hasPermission } from "../permissions/permission-scope";
import { Action } from "./actions.enum";

export type AppAbility = AnyMongoAbility;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AuthenticatedUser) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    const inventoryCreateBusinessAccountIds = user.businessMemberships
      .filter((membership) =>
        membership.permissions.includes("seller.inventory.create"),
      )
      .map((membership) => membership.businessAccountId)
      .filter(
        (businessAccountId, index, all) =>
          all.indexOf(businessAccountId) === index,
      );

    const inventoryUpdateBusinessAccountIds = user.businessMemberships
      .filter((membership) =>
        membership.permissions.some((permission) =>
          ["seller.inventory.update", "seller.inventory.restock"].includes(
            permission,
          ),
        ),
      )
      .map((membership) => membership.businessAccountId)
      .filter(
        (businessAccountId, index, all) =>
          all.indexOf(businessAccountId) === index,
      );

    const canManageInventory =
      hasPermission(user, "seller.inventory.create") ||
      hasPermission(user, "seller.inventory.update") ||
      hasPermission(user, "seller.inventory.restock");
    const isAdmin = user.isAdmin === true;

    if (isAdmin) {
      can(Action.Manage, "all");
      return build();
    }

    if (canManageInventory) {
      can(Action.Create, "Brand");
      can(Action.Create, "Product");
      can(Action.Update, "Product");
    }

    if (inventoryCreateBusinessAccountIds.length > 0) {
      can(Action.Create, "Inventory", {
        businessAccountId: { $in: inventoryCreateBusinessAccountIds },
      });
    }

    if (inventoryUpdateBusinessAccountIds.length > 0) {
      can(Action.Update, "Inventory", {
        businessAccountId: { $in: inventoryUpdateBusinessAccountIds },
      });
    }

    return build();
  }
}
