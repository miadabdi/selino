import type {
  SupportTicketPriority,
  SupportTicketStatus,
} from "./dto/list-tickets-query.dto.js";

export type SupportAttachment = {
  id: number;
  fileId: number;
  messageId: number | null;
  createdAt: Date;
};

export type SupportMessage = {
  id: number;
  authorId: number;
  authorName: string | null;
  body: string;
  createdAt: Date;
  attachments: SupportAttachment[];
};

export type SupportTicket = {
  id: number;
  ticketNumber: string;
  businessAccountId: number;
  requesterId: number;
  assignedTo: number | null;
  subject: string;
  category: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type SupportTicketDetail = SupportTicket & {
  messages: SupportMessage[];
};

export type PaginatedSupportTickets = {
  items: SupportTicket[];
  page: number;
  limit: number;
  total: number;
};
