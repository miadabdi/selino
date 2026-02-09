import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module.js";
import { OtpService } from "./otp.service.js";

@Module({
  imports: [NotificationModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
