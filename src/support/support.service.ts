import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { assertBusinessPermission } from "../auth/permissions/index.js";
import type { CreateTicketDto } from "./dto/create-ticket.dto.js";
import type { CreateTicketMessageDto } from "./dto/create-ticket-message.dto.js";
import type { ListTicketsQueryDto } from "./dto/list-tickets-query.dto.js";
import type { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto.js";
import { SupportRepository } from "./support.repository.js";

@Injectable()
export class SupportService {
  constructor(private readonly repository: SupportRepository) {}

  list(
    user: AuthenticatedUser,
    businessAccountId: number,
    query: ListTicketsQueryDto,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.support.read");
    return this.repository.list(businessAccountId, query);
  }

  async get(user: AuthenticatedUser, businessAccountId: number, id: number) {
    assertBusinessPermission(user, businessAccountId, "manager.support.read");
    return this.assertTicket(businessAccountId, id);
  }

  async create(
    user: AuthenticatedUser,
    businessAccountId: number,
    dto: CreateTicketDto,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.support.create");
    const id = await this.repository.create(businessAccountId, user.id, dto);
    return this.assertTicket(businessAccountId, id);
  }

  async addMessage(
    user: AuthenticatedUser,
    businessAccountId: number,
    id: number,
    dto: CreateTicketMessageDto,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.support.reply");
    const ticket = await this.assertTicket(businessAccountId, id);
    if (ticket.status === "closed") {
      throw new NotFoundException("Support ticket is closed");
    }
    await this.repository.addMessage(businessAccountId, id, user.id, dto);
    return this.assertTicket(businessAccountId, id);
  }

  async updateStatus(
    user: AuthenticatedUser,
    businessAccountId: number,
    id: number,
    dto: UpdateTicketStatusDto,
  ) {
    assertBusinessPermission(user, businessAccountId, "manager.support.update");
    await this.assertTicket(businessAccountId, id);
    await this.repository.updateStatus(businessAccountId, id, dto);
    return this.assertTicket(businessAccountId, id);
  }

  private async assertTicket(businessAccountId: number, id: number) {
    const ticket = await this.repository.findById(businessAccountId, id);
    if (!ticket) {
      throw new NotFoundException("Support ticket not found");
    }
    return ticket;
  }
}
