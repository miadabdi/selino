import { OmitType } from "@nestjs/swagger";
import { StoreMember } from "../../database";
import { UserBase } from "./user-base.dto";

export class GetMeResponse extends OmitType(UserBase, ["deletedAt"] as const) {
  storeMemberships: StoreMember[];
}
