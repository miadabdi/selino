import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export const RABBITMQ_EXCHANGE_NOTIFICATION = "notification.exchange";

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>("RABBITMQ_URI"),
        exchanges: [
          {
            name: RABBITMQ_EXCHANGE_NOTIFICATION,
            type: "topic",
          },
        ],
        connectionInitOptions: { wait: true },
      }),
    }),
  ],
  exports: [RabbitMQModule],
})
export class RabbitmqModule {}
