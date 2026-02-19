import {
  Body,
  Controller,
  Delete,
  Get,
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
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { imageFileFilter } from "../files/image-file-filter.js";
import { AddProductImageDto } from "./dto/add-product-image.dto.js";
import { CreateProductBody } from "./dto/create-product-body.dto.js";
import { CreateProductDto } from "./dto/create-product.dto.js";
import { ReorderProductImagesDto } from "./dto/reorder-product-images.dto.js";
import { UpdateProductBody } from "./dto/update-product-body.dto.js";
import { UpdateProductDto } from "./dto/update-product.dto.js";
import { ProductsService } from "./products.service.js";

const MAX_PRODUCT_PICTURE_BYTES = 10 * 1024 * 1024;
const MAX_PRODUCT_PICTURE_COUNT = 15;

@ApiTags("Products")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.productsService.list(query);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor("pictures", MAX_PRODUCT_PICTURE_COUNT, {
      limits: { fileSize: MAX_PRODUCT_PICTURE_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateProductBody })
  create(
    @Req() req: Request,
    @Body() dto: CreateProductDto,
    @UploadedFiles() pictures?: Express.Multer.File[],
  ) {
    const user = req.user as { id: number };
    return this.productsService.create(dto, user.id, pictures ?? []);
  }

  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.getById(id);
  }

  @Patch(":id")
  @UseInterceptors(
    FilesInterceptor("pictures", MAX_PRODUCT_PICTURE_COUNT, {
      limits: { fileSize: MAX_PRODUCT_PICTURE_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UpdateProductBody })
  update(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() pictures?: Express.Multer.File[],
  ) {
    const user = req.user as { id: number };
    return this.productsService.update(id, dto, user.id, pictures ?? []);
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
