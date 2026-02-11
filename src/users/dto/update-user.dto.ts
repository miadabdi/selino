import { PartialType, PickType } from "@nestjs/swagger";
import { UserBase } from "./user-base.dto.js";

export class UpdateUserDto extends PartialType(
  PickType(UserBase, ["firstName", "lastName", "email"] as const),
) {}
