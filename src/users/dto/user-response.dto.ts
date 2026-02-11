import { OmitType } from "@nestjs/swagger";
import { UserBase } from "./user-base.dto.js";

export class UserResponse extends OmitType(UserBase, ["deletedAt"] as const) {}
