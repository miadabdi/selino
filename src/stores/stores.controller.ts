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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { imageFileFilter } from "../files/image-file-filter";
import { AddStoreMemberDto } from "./dto/add-store-member.dto";
import { CreateStoreBody } from "./dto/create-store-body.dto";
import { CreateStoreDto } from "./dto/create-store.dto";
import { UpdateStoreBody } from "./dto/update-store-body.dto";
import { UpdateStoreDto } from "./dto/update-store.dto";
import { StoresService } from "./stores.service";

@Injectable()
export class StoreLogoUploadInterceptor implements NestInterceptor {
  private readonly interceptor: NestInterceptor;

  constructor(private readonly configService: ConfigService) {
    const maxLogoBytes = this.configService.getOrThrow<number>(
      "UPLOAD_MAX_STORE_LOGO_BYTES",
    );
    const MixinInterceptor = FileInterceptor("logo", {
      limits: { fileSize: maxLogoBytes },
      fileFilter: imageFileFilter,
    });
    this.interceptor = new MixinInterceptor();
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    return this.interceptor.intercept(context, next);
  }
}

@ApiTags("Stores")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("stores")
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @UseInterceptors(StoreLogoUploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateStoreBody })
  create(
    @Req() req: Request,
    @Body() dto: CreateStoreDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    const user = req.user as { id: number };
    return this.storesService.create(user.id, dto, logo);
  }

  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number) {
    return this.storesService.getById(id);
  }

  @Patch(":id")
  @UseInterceptors(StoreLogoUploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UpdateStoreBody })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateStoreDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.storesService.update(id, dto, logo);
  }

  @Delete(":id")
  softDelete(@Param("id", ParseIntPipe) id: number) {
    return this.storesService.softDelete(id);
  }

  @Post(":id/members")
  addMember(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AddStoreMemberDto,
  ) {
    return this.storesService.addMember(id, dto);
  }

  @Delete(":id/members/:userId")
  removeMember(
    @Param("id", ParseIntPipe) id: number,
    @Param("userId", ParseIntPipe) userId: number,
  ) {
    return this.storesService.removeMember(id, userId);
  }
}
