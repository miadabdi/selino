import { SetMetadata } from "@nestjs/common";
import type { Type } from "@nestjs/common";
import type { Request } from "express";
import type { AppAbility } from "./casl-ability.factory.js";

export const CHECK_POLICIES_KEY = "check_policy";

export type ServiceToken<TService> = Type<TService> | string | symbol;

export interface PolicyContext {
  request: Request;
  getService: <TService>(token: ServiceToken<TService>) => TService;
}

export type PolicyHandler = (
  ability: AppAbility,
  request: Request,
  context: PolicyContext,
) => Promise<boolean> | boolean;

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
