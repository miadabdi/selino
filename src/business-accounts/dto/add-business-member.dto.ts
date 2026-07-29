import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, Min } from "class-validator";
import {
  businessMemberRoles,
  type BusinessMemberRole,
} from "./update-business-member.dto.js";

export class AddBusinessMemberDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({
    description: "Stable role key from roles.name",
    enum: businessMemberRoles,
  })
  @IsIn(businessMemberRoles)
  role!: BusinessMemberRole;
}
