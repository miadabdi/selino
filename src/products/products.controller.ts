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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { imageFileFilter } from "../files/image-file-filter";
import { AddProductImageDto } from "./dto/add-product-image.dto";
import { CreateProductBody } from "./dto/create-product-body.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { ReorderProductImagesDto } from "./dto/reorder-product-images.dto";
import { UpdateProductBody } from "./dto/update-product-body.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

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

@ApiTags("Products")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.productsService.list(query);
  }

  @Post()
  @UseInterceptors(ProductPicturesUploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateProductBody })
  create(
    @Req() req: Request,
    @Body() dto: CreateProductDto,
    @UploadedFiles() pictures?: Express.Multer.File[],
  ) {
    const user = req.user as AuthenticatedUser;
    return this.productsService.create(dto, user, pictures ?? []);
  }

  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.getById(id);
  }

  @Patch(":id")
  @UseInterceptors(ProductPicturesUploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UpdateProductBody })
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
  softDelete(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.softDelete(id);
  }

  @Post(":id/images")
  addImage(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AddProductImageDto,
  ) {
    return this.productsService.addImage(id, dto);
  }

  @Patch(":id/images/reorder")
  reorderImages(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReorderProductImagesDto,
  ) {
    return this.productsService.reorderImages(id, dto);
  }
}
