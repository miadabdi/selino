import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, TXContext } from "../database/database.types.js";
import type { CreateTicketDto } from "./dto/create-ticket.dto.js";
import type { CreateTicketMessageDto } from "./dto/create-ticket-message.dto.js";
import type { ListTicketsQueryDto } from "./dto/list-tickets-query.dto.js";
import type { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto.js";
import type {
  PaginatedSupportTickets,
  SupportAttachment,
  SupportMessage,
  SupportTicket,
  SupportTicketDetail,
} from "./support.types.js";

type CountRow = { total: number };

@Injectable()
export class SupportRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async list(
    businessAccountId: number,
    query: ListTicketsQueryDto,
    txContext: TXContext = this.db,
  ): Promise<PaginatedSupportTickets> {
    const offset = (query.page - 1) * query.limit;
    const statusFilter = query.status
      ? sql`and ticket.status = ${query.status}`
      : sql``;
    const priorityFilter = query.priority
      ? sql`and ticket.priority = ${query.priority}`
      : sql``;
    const searchFilter = query.search
      ? sql`and (
          ticket.subject ilike ${`%${query.search}%`}
          or ticket.ticket_number ilike ${`%${query.search}%`}
        )`
      : sql``;

    const [items, countRows] = await Promise.all([
      txContext.execute<SupportTicket>(sql`
        select
          ticket.id,
          ticket.ticket_number as "ticketNumber",
          ticket.business_account_id as "businessAccountId",
          ticket.requester_id as "requesterId",
          ticket.assigned_to as "assignedTo",
          ticket.subject,
          ticket.category,
          ticket.status,
          ticket.priority,
          ticket.last_message_at as "lastMessageAt",
          ticket.created_at as "createdAt",
          ticket.updated_at as "updatedAt"
        from support_tickets ticket
        where ticket.business_account_id = ${businessAccountId}
          and ticket.deleted_at is null
          ${statusFilter}
          ${priorityFilter}
          ${searchFilter}
        order by ticket.last_message_at desc, ticket.id desc
        limit ${query.limit}
        offset ${offset}
      `),
      txContext.execute<CountRow>(sql`
        select count(*)::int as total
        from support_tickets ticket
        where ticket.business_account_id = ${businessAccountId}
          and ticket.deleted_at is null
          ${statusFilter}
          ${priorityFilter}
          ${searchFilter}
      `),
    ]);

    return {
      items: [...items],
      page: query.page,
      limit: query.limit,
      total: countRows[0]?.total ?? 0,
    };
  }

  async findById(
    businessAccountId: number,
    id: number,
    txContext: TXContext = this.db,
  ): Promise<SupportTicketDetail | undefined> {
    const tickets = await txContext.execute<SupportTicket>(sql`
      select
        ticket.id,
        ticket.ticket_number as "ticketNumber",
        ticket.business_account_id as "businessAccountId",
        ticket.requester_id as "requesterId",
        ticket.assigned_to as "assignedTo",
        ticket.subject,
        ticket.category,
        ticket.status,
        ticket.priority,
        ticket.last_message_at as "lastMessageAt",
        ticket.created_at as "createdAt",
        ticket.updated_at as "updatedAt"
      from support_tickets ticket
      where ticket.id = ${id}
        and ticket.business_account_id = ${businessAccountId}
        and ticket.deleted_at is null
      limit 1
    `);
    const ticket = tickets[0];
    if (!ticket) return undefined;

    const [messages, attachments] = await Promise.all([
      txContext.execute<SupportMessage>(sql`
        select
          message.id,
          message.author_id as "authorId",
          concat_ws(' ', author.first_name, author.last_name) as "authorName",
          message.body,
          message.created_at as "createdAt"
        from support_ticket_messages message
        left join users author on author.id = message.author_id
        where message.ticket_id = ${id}
        order by message.created_at, message.id
      `),
      txContext.execute<SupportAttachment>(sql`
        select
          attachment.id,
          attachment.file_id as "fileId",
          attachment.message_id as "messageId",
          attachment.created_at as "createdAt"
        from support_ticket_attachments attachment
        inner join support_ticket_messages message
          on message.id = attachment.message_id
        where message.ticket_id = ${id}
        order by attachment.id
      `),
    ]);

    return {
      ...ticket,
      messages: messages.map((message) => ({
        ...message,
        attachments: attachments.filter(
          (attachment) => attachment.messageId === message.id,
        ),
      })),
    };
  }

  async create(
    businessAccountId: number,
    userId: number,
    dto: CreateTicketDto,
  ): Promise<number> {
    return this.transaction(async (tx) => {
      const tickets = await tx.execute<{ id: number }>(sql`
        insert into support_tickets (
          business_account_id,
          requester_id,
          subject,
          description,
          category,
          status,
          priority,
          last_message_at
        )
        values (
          ${businessAccountId},
          ${userId},
          ${dto.subject},
          ${dto.message},
          ${dto.category ?? "other"},
          'open',
          ${dto.priority},
          now()
        )
        returning id
      `);
      const ticketId = tickets[0].id;
      await tx.execute(sql`
        insert into support_ticket_messages (ticket_id, author_id, body)
        values (${ticketId}, ${userId}, ${dto.message})
      `);
      return ticketId;
    });
  }

  async addMessage(
    businessAccountId: number,
    ticketId: number,
    userId: number,
    dto: CreateTicketMessageDto,
  ): Promise<number> {
    return this.transaction(async (tx) => {
      const messages = await tx.execute<{ id: number }>(sql`
        insert into support_ticket_messages (ticket_id, author_id, body)
        select ticket.id, ${userId}, ${dto.body}
        from support_tickets ticket
        where ticket.id = ${ticketId}
          and ticket.business_account_id = ${businessAccountId}
          and ticket.deleted_at is null
        returning id
      `);
      const messageId = messages[0].id;
      if (dto.fileIds.length > 0) {
        await tx.execute(sql`
          insert into support_ticket_attachments (
            ticket_id,
            message_id,
            file_id,
            uploaded_by
          )
          select ${ticketId}, ${messageId}, file_id, ${userId}
          from unnest(${dto.fileIds}::int[]) as file_id
        `);
      }
      await tx.execute(sql`
        update support_tickets
        set last_message_at = now(), updated_at = now()
        where id = ${ticketId}
          and business_account_id = ${businessAccountId}
      `);
      return messageId;
    });
  }

  async updateStatus(
    businessAccountId: number,
    id: number,
    dto: UpdateTicketStatusDto,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext.execute(sql`
      update support_tickets
      set status = ${dto.status}, updated_at = now()
      where id = ${id}
        and business_account_id = ${businessAccountId}
        and deleted_at is null
    `);
  }
}
