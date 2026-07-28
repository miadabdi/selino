import {
  AbilityBuilder,
  AnyMongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../interfaces/index";
import { Action } from "./actions.enum";

export type AppAbility = AnyMongoAbility;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AuthenticatedUser) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    const writableBusinessAccountIds = user.businessMemberships
      .filter((membership) =>
        membership.permissions.some((permission) =>
          permission.endsWith(".write"),
        ),
      )
      .map((membership) => membership.businessAccountId)
      .filter(
        (businessAccountId, index, all) =>
          all.indexOf(businessAccountId) === index,
      );

    const hasWritePermissionInAnyBusinessAccount =
      writableBusinessAccountIds.length > 0;
    const isAdmin = user.isAdmin === true;

    if (isAdmin) {
      can(Action.Manage, "all");
      return build();
    }

    if (hasWritePermissionInAnyBusinessAccount) {
      can(Action.Create, "Brand");
      can(Action.Create, "Product");
      can(Action.Update, "Product");
    }

    if (writableBusinessAccountIds.length > 0) {
      can(Action.Create, "Inventory", {
        businessAccountId: { $in: writableBusinessAccountIds },
      });
      can(Action.Update, "Inventory", {
        businessAccountId: { $in: writableBusinessAccountIds },
      });
    }

    if (writableBusinessAccountIds.length > 0) {
      can(Action.Create, "PurchaseRequest", {
        buyerBusinessAccountId: { $in: writableBusinessAccountIds },
      });
      can(Action.Update, "PurchaseRequest", {
        buyerBusinessAccountId: { $in: writableBusinessAccountIds },
      });
    }

    return build();
  }
}
