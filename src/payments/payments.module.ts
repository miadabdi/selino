import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { WalletsModule } from "../wallets/wallets.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsRepository } from "./payments.repository";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [WalletsModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
