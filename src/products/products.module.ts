import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module.js";
import { FilesModule } from "../files/files.module.js";
import { ProductsController } from "./products.controller.js";
import { ProductsService } from "./products.service.js";

@Module({
  imports: [FilesModule, CategoriesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
