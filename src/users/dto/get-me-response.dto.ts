import { ApiProperty, ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { UserBase } from "./user-base.dto";

export class BusinessMembershipResponse {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  businessAccountId!: number;

  @ApiProperty()
  businessName!: string;

  @ApiProperty({ examples: ["manager", "seller", "collector"] })
  role!: string;

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty()
  isActive!: boolean;
}

export class GetMeResponse extends OmitType(UserBase, ["deletedAt"] as const) {
  @ApiPropertyOptional({ nullable: true })
  profilePictureUrl!: string | null;

  @ApiProperty({
    enum: ["manager", "seller", "collector", "admin"],
    nullable: true,
  })
  role!: "manager" | "seller" | "collector" | "admin" | null;

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty({ type: [BusinessMembershipResponse] })
  businessMemberships!: BusinessMembershipResponse[];
}
