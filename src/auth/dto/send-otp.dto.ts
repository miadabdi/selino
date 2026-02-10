import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches } from "class-validator";

export class SendOtpDto {
  @ApiProperty({
    description: "Phone number in E.164 format",
    example: "+989123456789",
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: "phone must be a valid E.164 phone number",
  })
  phone: string;
}
