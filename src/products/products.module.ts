import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module.js";
import { FilesModule } from "../files/files.module.js";
import {
  ProductPicturesUploadInterceptor,
  ProductsController,
} from "./products.controller.js";
import { ProductsRepository } from "./products.repository.js";
import { ProductsService } from "./products.service.js";

@Module({
  imports: [FilesModule, CategoriesModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsRepository,
    ProductPicturesUploadInterceptor,
  ],
  exports: [ProductsService, ProductsRepository],
})
export class ProductsModule {}
