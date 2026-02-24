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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserEnrichmentGuard } from "../auth/guards/user-enrichment.guard";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { ReplaceSpecSchemaDto } from "./dto/replace-spec-schema.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

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
