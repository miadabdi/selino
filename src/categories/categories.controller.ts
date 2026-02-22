import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard.js";
import { CategoriesService } from "./categories.service.js";
import { CreateCategoryDto } from "./dto/create-category.dto.js";
import { ReplaceSpecSchemaDto } from "./dto/replace-spec-schema.dto.js";
import { UpdateCategoryDto } from "./dto/update-category.dto.js";

@ApiTags("Categories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, UserEnrichmentGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list() {
    return this.categoriesService.listHierarchy();
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateCategoryDto) {
    const user = req.user as AuthenticatedUser;
    return this.categoriesService.create(user, dto);
  }

  @Patch(":id")
  update(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.categoriesService.update(user, id, dto);
  }

  @Get(":id/spec-schema")
  getSpecSchema(@Param("id", ParseIntPipe) id: number) {
    return this.categoriesService.getSpecSchema(id);
  }

  @Put(":id/spec-schema")
  replaceSpecSchema(
    @Req() req: Request,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReplaceSpecSchemaDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.categoriesService.replaceSpecSchema(user, id, dto);
  }
}
