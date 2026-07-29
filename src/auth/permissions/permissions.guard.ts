import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedUser } from "../interfaces/index";
import {
  REQUIRED_ANY_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from "./permissions.decorator";
import { hasPermission } from "./permission-scope";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const requiredAnyPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_ANY_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (
      requiredPermissions.length === 0 &&
      requiredAnyPermissions.length === 0
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user?.id) {
      throw new UnauthorizedException("User not authenticated");
    }

    const allowed = requiredPermissions.every((permission) =>
      hasPermission(user, permission),
    );
    const anyAllowed =
      requiredAnyPermissions.length === 0 ||
      requiredAnyPermissions.some((permission) =>
        hasPermission(user, permission),
      );

    if (!allowed || !anyAllowed) {
      throw new ForbiddenException(
        "You do not have permission for this action",
      );
    }

    return true;
  }
}
