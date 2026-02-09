import { Module } from "@nestjs/common";
import { SmsModule } from "../sms/sms.module.js";
import { OtpService } from "./otp.service.js";

@Module({
  imports: [SmsModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
