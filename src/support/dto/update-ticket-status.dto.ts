import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import {
  supportTicketStatuses,
  type SupportTicketStatus,
} from "./list-tickets-query.dto.js";

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: supportTicketStatuses })
  @IsIn(supportTicketStatuses)
  status!: SupportTicketStatus;
}
