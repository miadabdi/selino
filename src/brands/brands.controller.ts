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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { GetUser } from "../auth/decorators/get-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { BrandsService } from "./brands.service.js";
import { CreateBrandDto } from "./dto/create-brand.dto.js";
import { UpdateBrandDto } from "./dto/update-brand.dto.js";

@ApiTags("Brands")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard)
@Controller("brands")
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  list() {
    return this.brandsService.list();
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateBrandDto) {
    const user = req.user as AuthenticatedUser;
    return this.brandsService.create(user, dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @GetUser() user: AuthenticatedUser,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(id, user, dto);
  }
}
