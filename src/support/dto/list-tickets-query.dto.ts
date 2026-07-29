import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const supportTicketStatuses = [
  "open",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed",
] as const;
export type SupportTicketStatus = (typeof supportTicketStatuses)[number];

export const supportTicketPriorities = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;
export type SupportTicketPriority = (typeof supportTicketPriorities)[number];

export const supportTicketCategories = [
  "account",
  "catalog",
  "credit",
  "invoice",
  "order",
  "payment",
  "shipment",
  "technical",
  "other",
] as const;
export type SupportTicketCategory = (typeof supportTicketCategories)[number];

export class ListTicketsQueryDto {
  @ApiPropertyOptional({ enum: supportTicketStatuses })
  @IsIn(supportTicketStatuses)
  @IsOptional()
  status?: SupportTicketStatus;

  @ApiPropertyOptional({ enum: supportTicketPriorities })
  @IsIn(supportTicketPriorities)
  @IsOptional()
  priority?: SupportTicketPriority;

  @ApiPropertyOptional({ description: "Search ticket number or subject." })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;
}
