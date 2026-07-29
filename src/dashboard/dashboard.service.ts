import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import type { DashboardQueryDto } from "./dto/dashboard-query.dto.js";
import { DashboardRepository } from "./dashboard.repository.js";
import type { DashboardRange } from "./dashboard.types.js";

@Injectable()
export class DashboardService {
  private static readonly overviewPermissions = [
    "seller.dashboard.overview",
    "manager.dashboard.read",
    "manager.dashboard.overview",
  ];

  constructor(private readonly repository: DashboardRepository) {}

  async getOverview(
    user: AuthenticatedUser,
    businessAccountId: number,
    query: DashboardQueryDto,
  ) {
    this.assertOverviewPermission(user, businessAccountId);
    const range = this.resolveRange(query);
    const overview = await this.repository.getOverview(
      businessAccountId,
      range,
    );
    return {
      range: {
        from: range.from.toISOString(),
        to: new Date(range.to.getTime() - 1).toISOString(),
      },
      ...overview,
    };
  }

  private assertOverviewPermission(
    user: AuthenticatedUser,
    businessAccountId: number,
  ) {
    if (user.isAdmin === true || user.permissions.includes("*")) return;
    const allowed = user.businessMemberships.some(
      (membership) =>
        membership.isActive &&
        membership.businessAccountId === businessAccountId &&
        (membership.permissions.includes("*") ||
          DashboardService.overviewPermissions.some((permission) =>
            membership.permissions.includes(permission),
          )),
    );
    if (!allowed) {
      throw new ForbiddenException(
        "Dashboard overview permission is required for this business",
      );
    }
  }

  private resolveRange(query: DashboardQueryDto): DashboardRange {
    const to = query.to ? new Date(query.to) : new Date();
    to.setUTCHours(23, 59, 59, 999);
    const exclusiveTo = new Date(to.getTime() + 1);

    const from = query.from
      ? new Date(query.from)
      : new Date(exclusiveTo.getTime() - 30 * 24 * 60 * 60 * 1000);
    from.setUTCHours(0, 0, 0, 0);

    if (from >= exclusiveTo) {
      throw new BadRequestException(
        "Dashboard period start must be before its end",
      );
    }
    return { from, to: exclusiveTo };
  }
}
