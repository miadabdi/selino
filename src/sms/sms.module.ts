import { Module } from "@nestjs/common";
import { ConsoleSmsProvider } from "./providers/console-sms.provider.js";
import { SmsProvider } from "./sms-provider.abstract.js";

@Module({
  providers: [
    {
      provide: SmsProvider,
      useClass: ConsoleSmsProvider,
    },
  ],
  exports: [SmsProvider],
})
export class SmsModule {}
