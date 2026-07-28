import {
  Body,
  CallHandler,
  Controller,
  Delete,
  ExecutionContext,
  Get,
  Injectable,
  NestInterceptor,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { imageFileFilter } from "../files/image-file-filter";
import { AddProductImageDto } from "./dto/add-product-image.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { ReorderProductImagesDto } from "./dto/reorder-product-images.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";
import * as Swagger from "./products.swagger";

@Injectable()
export class ProductPicturesUploadInterceptor implements NestInterceptor {
  private readonly interceptor: NestInterceptor;

  constructor(private readonly configService: ConfigService) {
    const maxPictureCount = this.configService.getOrThrow<number>(
      "UPLOAD_MAX_PRODUCT_PICTURE_COUNT",
    );
    const maxPictureBytes = this.configService.getOrThrow<number>(
      "UPLOAD_MAX_PRODUCT_PICTURE_BYTES",
    );
    const MixinInterceptor = FilesInterceptor("pictures", maxPictureCount, {
      limits: { fileSize: maxPictureBytes },
      fileFilter: imageFileFilter,
    });
    this.interceptor = new MixinInterceptor();
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    return this.interceptor.intercept(context, next);
  }
}

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Swagger.List()
  list(@Query() query: Record<string, unknown>) {
    return this.productsService.list(query);
  }

  @Post()
  @UseInterceptors(ProductPicturesUploadInterceptor)
  @Swagger.Create()
  create(
    @Req() req: Request,
    @Body() dto: CreateProductDto,
    @UploadedFiles() pictures?: Express.Multer.File[],
  ) {
    const user = req.user as AuthenticatedUser;
    return this.productsService.create(dto, user, pictures ?? []);
  }

  @Get(":id")
  @Swagger.GetById()
  getById(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.getById(id);
  }

  @Patch(":id")
  @UseInterceptors(ProductPicturesUploadInterceptor)
  @Swagger.Update()
  update(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() pictures?: Express.Multer.File[],
  ) {
    const user = req.user as AuthenticatedUser;
    return this.productsService.update(id, dto, user, pictures ?? []);
  }

  @Delete(":id")
  @Swagger.Delete()
  softDelete(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.softDelete(id);
  }

  @Post(":id/images")
  @Swagger.AddImage()
  addImage(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AddProductImageDto,
  ) {
    return this.productsService.addImage(id, dto);
  }

  @Patch(":id/images/reorder")
  @Swagger.ReorderImages()
  reorderImages(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReorderProductImagesDto,
  ) {
    return this.productsService.reorderImages(id, dto);
  }
}
