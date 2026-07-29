import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { InvoiceExportService } from "./invoice-export.service";
import { InvoicesController } from "./invoices.controller";
import { InvoicesRepository } from "./invoices.repository";
import { InvoicesService } from "./invoices.service";

@Module({
  imports: [OrdersModule],
  controllers: [InvoicesController],
  providers: [InvoicesRepository, InvoicesService, InvoiceExportService],
})
export class InvoicesModule {}
