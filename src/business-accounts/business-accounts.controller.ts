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
import { BusinessAccountsService } from "./business-accounts.service";
import { AddBusinessMemberDto } from "./dto/add-business-member.dto";
import { CreateBusinessAccountBody } from "./dto/create-business-account-body.dto";
import { CreateBusinessAccountDto } from "./dto/create-business-account.dto";
import { UpdateBusinessAccountBody } from "./dto/update-business-account-body.dto";
import { UpdateBusinessAccountDto } from "./dto/update-business-account.dto";

@Injectable()
export class BusinessAccountLogoUploadInterceptor implements NestInterceptor {
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

@ApiTags("Business Accounts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("business-accounts")
export class BusinessAccountsController {
  constructor(
    private readonly businessAccountsService: BusinessAccountsService,
  ) {}

  @Post()
  @UseInterceptors(BusinessAccountLogoUploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateBusinessAccountBody })
  create(
    @Req() req: Request,
    @Body() dto: CreateBusinessAccountDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    const user = req.user as { id: number };
    return this.businessAccountsService.create(user.id, dto, logo);
  }

  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number) {
    return this.businessAccountsService.getById(id);
  }

  @Patch(":id")
  @UseInterceptors(BusinessAccountLogoUploadInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UpdateBusinessAccountBody })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessAccountDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.businessAccountsService.update(id, dto, logo);
  }

  @Delete(":id")
  softDelete(@Param("id", ParseIntPipe) id: number) {
    return this.businessAccountsService.softDelete(id);
  }

  @Post(":id/members")
  addMember(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AddBusinessMemberDto,
  ) {
    return this.businessAccountsService.addMember(id, dto);
  }

  @Delete(":id/members/:userId")
  removeMember(
    @Param("id", ParseIntPipe) id: number,
    @Param("userId", ParseIntPipe) userId: number,
  ) {
    return this.businessAccountsService.removeMember(id, userId);
  }
}
