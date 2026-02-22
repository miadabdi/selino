import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module.js";
import { OtpRepository } from "./otp.repository.js";
import { OtpService } from "./otp.service.js";

@Module({
  imports: [NotificationModule],
  providers: [OtpService, OtpRepository],
  exports: [OtpService, OtpRepository],
})
export class OtpModule {}
