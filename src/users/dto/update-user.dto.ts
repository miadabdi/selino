import { PartialType, PickType } from "@nestjs/swagger";
import { UserBase } from "./user-base.dto";

export class UpdateUserDto extends PartialType(
  PickType(UserBase, [
    "firstName",
    "lastName",
    "email",
    "nationalCode",
    "birthDate",
  ] as const),
) {}
