import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { BrandsService } from "./brands.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";
import * as Swagger from "./brands.swagger";

@Swagger.ControllerDocs()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard)
@Controller("brands")
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Swagger.List()
  list() {
    return this.brandsService.list();
  }

  @Post()
  @Swagger.Create()
  create(@Req() req: Request, @Body() dto: CreateBrandDto) {
    const user = req.user as AuthenticatedUser;
    return this.brandsService.create(user, dto);
  }

  @Patch(":id")
  @Swagger.Update()
  update(
    @Param("id", ParseIntPipe) id: number,
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(id, user, dto);
  }
}
