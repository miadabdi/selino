import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt } from "class-validator";
import {
  StoreMemberRole,
  storeMemberRoleEnum,
} from "../../database/schema/store-members.schema.js";

export class AddStoreMemberDto {
  @ApiProperty()
  @IsInt()
  userId!: number;

  @ApiProperty({ enum: StoreMemberRole })
  @IsIn(storeMemberRoleEnum.enumValues)
  role!: StoreMemberRole;
}
