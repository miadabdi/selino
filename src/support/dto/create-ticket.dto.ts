import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  supportTicketCategories,
  supportTicketPriorities,
  type SupportTicketCategory,
  type SupportTicketPriority,
} from "./list-tickets-query.dto.js";

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ enum: supportTicketPriorities, default: "normal" })
  @IsIn(supportTicketPriorities)
  @IsOptional()
  priority: SupportTicketPriority = "normal";

  @ApiPropertyOptional({ enum: supportTicketCategories, default: "other" })
  @IsIn(supportTicketCategories)
  @IsOptional()
  category?: SupportTicketCategory = "other";
}
