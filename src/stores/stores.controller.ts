import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { imageFileFilter } from "../files/image-file-filter.js";
import { AddStoreMemberDto } from "./dto/add-store-member.dto.js";
import { CreateStoreBody } from "./dto/create-store-body.dto.js";
import { CreateStoreDto } from "./dto/create-store.dto.js";
import { UpdateStoreBody } from "./dto/update-store-body.dto.js";
import { UpdateStoreDto } from "./dto/update-store.dto.js";
import { StoresService } from "./stores.service.js";

const MAX_STORE_LOGO_BYTES = 10 * 1024 * 1024;

@ApiTags("Stores")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("stores")
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("logo", {
      limits: { fileSize: MAX_STORE_LOGO_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
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
  @UseInterceptors(
    FileInterceptor("logo", {
      limits: { fileSize: MAX_STORE_LOGO_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
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
