import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { assertBusinessPermission } from "../auth/permissions/index.js";
import type { CreateSupplierLinkDto } from "./dto/create-supplier-link.dto.js";
import type { ListSuppliersQueryDto } from "./dto/list-suppliers-query.dto.js";
import type { UpdateSupplierLinkDto } from "./dto/update-supplier-link.dto.js";
import { SuppliersRepository } from "./suppliers.repository.js";

@Injectable()
export class SuppliersService {
  constructor(private readonly repository: SuppliersRepository) {}

  list(
    user: AuthenticatedUser,
    businessAccountId: number,
    query: ListSuppliersQueryDto,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.suppliers.read");
    return this.repository.list(businessAccountId, query);
  }

  async get(user: AuthenticatedUser, businessAccountId: number, id: number) {
    assertBusinessPermission(user, businessAccountId, "manager.suppliers.read");
    return this.assertLink(businessAccountId, id);
  }

  async create(
    user: AuthenticatedUser,
    businessAccountId: number,
    dto: CreateSupplierLinkDto,
  ) {
    assertBusinessPermission(
      user,
      businessAccountId,
      "manager.suppliers.create",
    );
    if (businessAccountId === dto.supplierBusinessAccountId) {
      throw new BadRequestException(
        "A business account cannot be its own supplier",
      );
    }
    if (
      !(await this.repository.businessExists(dto.supplierBusinessAccountId))
    ) {
      throw new NotFoundException("Supplier business account not found");
    }
    const id = await this.repository.create(businessAccountId, user.id, dto);
    return this.assertLink(businessAccountId, id);
  }

  async update(
    user: AuthenticatedUser,
    businessAccountId: number,
    id: number,
    dto: UpdateSupplierLinkDto,
  ) {
    assertBusinessPermission(
      user,
      businessAccountId,
      "manager.suppliers.update",
    );
    await this.assertLink(businessAccountId, id);
    await this.repository.update(businessAccountId, id, dto);
    return this.assertLink(businessAccountId, id);
  }

  async remove(user: AuthenticatedUser, businessAccountId: number, id: number) {
    assertBusinessPermission(
      user,
      businessAccountId,
      "manager.suppliers.delete",
    );
    await this.assertLink(businessAccountId, id);
    await this.repository.remove(businessAccountId, id);
    return { message: "Supplier link removed successfully" };
  }

  private async assertLink(businessAccountId: number, id: number) {
    const link = await this.repository.findById(businessAccountId, id);
    if (!link) {
      throw new NotFoundException("Supplier link not found");
    }
    return link;
  }
}
