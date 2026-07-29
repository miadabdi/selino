import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BusinessAccountProfileDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  legalName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  slug!: string | null;

  @ApiProperty({ enum: ["store", "company"] })
  type!: "store" | "company";

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  registrationNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  nationalId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  taxId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  website!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoFileId!: number | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  licenseNumber!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "2024-01-01" })
  licenseIssuedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "2028-01-01" })
  licenseExpiresAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  licenseFileId!: number | null;

  @ApiPropertyOptional({ nullable: true })
  licenseUrl!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
