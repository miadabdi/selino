import { SetMetadata } from "@nestjs/common";
import type { Request } from "express";
import type { PurchaseRequestsService } from "../../purchase-requests/purchase-requests.service.js";
import type { StoresService } from "../../stores/stores.service.js";
import type { AppAbility } from "./casl-ability.factory.js";

export const CHECK_POLICIES_KEY = "check_policy";

export interface PolicyServices {
  purchaseRequestsService: PurchaseRequestsService;
  storesService: StoresService;
}

export type PolicyHandler = (
  ability: AppAbility,
  request: Request,
) => Promise<boolean> | boolean;

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
