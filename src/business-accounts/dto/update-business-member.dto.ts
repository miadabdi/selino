import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional } from "class-validator";

export const businessMemberRoles = [
  "manager",
  "seller",
  "seller_manager",
  "collector",
] as const;

export type BusinessMemberRole = (typeof businessMemberRoles)[number];

export class UpdateBusinessMemberDto {
  @ApiPropertyOptional({ enum: businessMemberRoles })
  @IsIn(businessMemberRoles)
  @IsOptional()
  role?: BusinessMemberRole;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
