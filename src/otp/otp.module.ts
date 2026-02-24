import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { OtpRepository } from "./otp.repository";
import { OtpService } from "./otp.service";

@Module({
  imports: [NotificationModule],
  providers: [OtpService, OtpRepository],
  exports: [OtpService, OtpRepository],
})
export class OtpModule {}
