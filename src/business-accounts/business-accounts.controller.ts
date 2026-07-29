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
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import {
  PermissionsGuard,
  RequireAnyPermission,
} from "../auth/permissions/index.js";
import { imageFileFilter } from "../files/image-file-filter";
import { BusinessAccountsService } from "./business-accounts.service";
import { AddBusinessMemberDto } from "./dto/add-business-member.dto";
import { CreateBusinessAddressDto } from "./dto/create-business-address.dto.js";
import { CreateBusinessAccountDto } from "./dto/create-business-account.dto";
import { UpdateBusinessAddressDto } from "./dto/update-business-address.dto.js";
import { UpdateBusinessAccountDto } from "./dto/update-business-account.dto";
import { UpdateBusinessMemberDto } from "./dto/update-business-member.dto.js";
import * as Swagger from "./business-accounts.swagger";

const profileReadPermissions = [
  "manager.dashboard.overview",
  "seller.dashboard.overview",
] as const;
const profileManagePermissions = ["manager.dashboard.overview"] as const;
const teamReadPermissions = ["manager.team.read", "seller.team.read"] as const;
const teamManagePermissions = [
  "manager.team.manage",
  "seller.team.manage",
] as const;

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

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard, PermissionsGuard)
@Controller("business-accounts")
export class BusinessAccountsController {
  constructor(
    private readonly businessAccountsService: BusinessAccountsService,
  ) {}

  @Post()
  @UseInterceptors(BusinessAccountLogoUploadInterceptor)
  @Swagger.Create()
  create(
    @Req() req: Request,
    @Body() dto: CreateBusinessAccountDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    const user = req.user as { id: number };
    return this.businessAccountsService.create(user.id, dto, logo);
  }

  @RequireAnyPermission(...profileReadPermissions)
  @Get(":id")
  @Swagger.GetById()
  getById(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    return this.businessAccountsService.getProfile(
      req.user as AuthenticatedUser,
      id,
    );
  }

  @RequireAnyPermission(...profileManagePermissions)
  @Patch(":id")
  @UseInterceptors(BusinessAccountLogoUploadInterceptor)
  @Swagger.Update()
  update(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateBusinessAccountDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.businessAccountsService.update(
      req.user as AuthenticatedUser,
      id,
      dto,
      logo,
    );
  }

  @RequireAnyPermission(...profileManagePermissions)
  @Delete(":id")
  @Swagger.Delete()
  softDelete(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    return this.businessAccountsService.softDelete(
      req.user as AuthenticatedUser,
      id,
    );
  }

  @RequireAnyPermission(...teamReadPermissions)
  @Get(":id/members")
  @Swagger.ListMembers()
  listMembers(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    return this.businessAccountsService.listMembers(
      req.user as AuthenticatedUser,
      id,
    );
  }

  @RequireAnyPermission(...teamReadPermissions)
  @Get(":id/members/:userId")
  @Swagger.GetMember()
  getMember(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Param("userId", ParseIntPipe) userId: number,
  ) {
    return this.businessAccountsService.getMember(
      req.user as AuthenticatedUser,
      id,
      userId,
    );
  }

  @RequireAnyPermission(...teamManagePermissions)
  @Post(":id/members")
  @Swagger.AddMember()
  addMember(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AddBusinessMemberDto,
  ) {
    return this.businessAccountsService.addMember(
      req.user as AuthenticatedUser,
      id,
      dto,
    );
  }

  @RequireAnyPermission(...teamManagePermissions)
  @Patch(":id/members/:userId")
  @Swagger.UpdateMember()
  updateMember(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Body() dto: UpdateBusinessMemberDto,
  ) {
    return this.businessAccountsService.updateMember(
      req.user as AuthenticatedUser,
      id,
      userId,
      dto,
    );
  }

  @RequireAnyPermission(...teamManagePermissions)
  @Delete(":id/members/:userId")
  @Swagger.RemoveMember()
  removeMember(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Param("userId", ParseIntPipe) userId: number,
  ) {
    return this.businessAccountsService.removeMember(
      req.user as AuthenticatedUser,
      id,
      userId,
    );
  }

  @RequireAnyPermission(...profileReadPermissions)
  @Get(":id/addresses")
  @Swagger.ListAddresses()
  listAddresses(@Req() req: Request, @Param("id", ParseIntPipe) id: number) {
    return this.businessAccountsService.listAddresses(
      req.user as AuthenticatedUser,
      id,
    );
  }

  @RequireAnyPermission(...profileReadPermissions)
  @Get(":id/addresses/:addressId")
  @Swagger.GetAddress()
  getAddress(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Param("addressId", ParseIntPipe) addressId: number,
  ) {
    return this.businessAccountsService.getAddress(
      req.user as AuthenticatedUser,
      id,
      addressId,
    );
  }

  @RequireAnyPermission(...profileManagePermissions)
  @Post(":id/addresses")
  @Swagger.CreateAddress()
  createAddress(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CreateBusinessAddressDto,
  ) {
    return this.businessAccountsService.createAddress(
      req.user as AuthenticatedUser,
      id,
      dto,
    );
  }

  @RequireAnyPermission(...profileManagePermissions)
  @Patch(":id/addresses/:addressId")
  @Swagger.UpdateAddress()
  updateAddress(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Param("addressId", ParseIntPipe) addressId: number,
    @Body() dto: UpdateBusinessAddressDto,
  ) {
    return this.businessAccountsService.updateAddress(
      req.user as AuthenticatedUser,
      id,
      addressId,
      dto,
    );
  }

  @RequireAnyPermission(...profileManagePermissions)
  @Delete(":id/addresses/:addressId")
  @Swagger.RemoveAddress()
  removeAddress(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Param("addressId", ParseIntPipe) addressId: number,
  ) {
    return this.businessAccountsService.removeAddress(
      req.user as AuthenticatedUser,
      id,
      addressId,
    );
  }
}
