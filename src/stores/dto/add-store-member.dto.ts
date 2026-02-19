import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt } from "class-validator";
import { storeMemberRoleEnum } from "../../database/schema/store-members.schema.js";

export class AddStoreMemberDto {
  @ApiProperty()
  @IsInt()
  userId!: number;

  @ApiProperty({ enum: storeMemberRoleEnum.enumValues })
  @IsIn(storeMemberRoleEnum.enumValues)
  role!: "owner" | "manager" | "seller" | "gatherer";
}
