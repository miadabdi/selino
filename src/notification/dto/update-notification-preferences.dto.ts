import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsObject,
  IsOptional,
  ValidateNested,
} from "class-validator";

export class NotificationCategoryPreferencesDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  credit?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  invoices?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  orders?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  payments?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  purchaseRequests?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  shipments?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  support?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ type: NotificationCategoryPreferencesDto })
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationCategoryPreferencesDto)
  @IsOptional()
  categories?: NotificationCategoryPreferencesDto;
}
