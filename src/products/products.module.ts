import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { FilesModule } from "../files/files.module";
import {
  ProductPicturesUploadInterceptor,
  ProductsController,
} from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

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
