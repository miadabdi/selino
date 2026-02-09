import { IsNotEmpty, IsString, Matches } from "class-validator";

export class SendOtpDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: "phone must be a valid E.164 phone number",
  })
  phone: string;
}
