import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { UsersService } from "../../users/users.service.js";

@Injectable()
export class UserEnrichmentGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtUser = request.user;

    if (!jwtUser || !jwtUser.id) {
      throw new UnauthorizedException("User not authenticated");
    }

    const fullUser = await this.usersService.findAuthenticatedById(jwtUser.id);

    if (!fullUser) {
      throw new UnauthorizedException("User not found");
    }

    // Replace the minimal JWT user with the full user
    request.user = fullUser;

    return true;
  }
}
