import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ModuleRef, Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { AuthenticatedUser } from "../interfaces/index.js";
import { CaslAbilityFactory } from "./casl-ability.factory.js";
import {
  CHECK_POLICIES_KEY,
  type PolicyContext,
  type PolicyHandler,
  type ServiceToken,
} from "./policies.decorator.js";

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlers =
      this.reflector.getAllAndOverride<PolicyHandler[]>(CHECK_POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (handlers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user?.id) {
      throw new UnauthorizedException("User not authenticated");
    }

    const ability = this.caslAbilityFactory.createForUser(user);
    const policyContext: PolicyContext = {
      request,
      getService: <TService>(token: ServiceToken<TService>) =>
        this.moduleRef.get<TService>(token, { strict: false }),
    };

    for (const handler of handlers) {
      const allowed = await handler(ability, request, policyContext);
      if (!allowed) {
        throw new ForbiddenException(
          "You do not have permission for this action",
        );
      }
    }

    return true;
  }
}
