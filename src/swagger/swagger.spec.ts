import { METHOD_METADATA } from "@nestjs/common/constants";
import { AppController } from "../app.controller";
import { AuthController } from "../auth/auth.controller";
import { BrandsController } from "../brands/brands.controller";
import { BusinessAccountsController } from "../business-accounts/business-accounts.controller";
import { CategoriesController } from "../categories/categories.controller";
import { FilesController } from "../files/files.controller";
import { InventoriesController } from "../inventories/inventories.controller";
import { ProductsController } from "../products/products.controller";
import { PurchaseRequestsController } from "../purchase-requests/purchase-requests.controller";
import { TradeNetworkController } from "../trade-network/trade-network.controller";
import { UsersController } from "../users/users.controller";
import { createSwaggerConfig } from "./swagger.config";

jest.mock("uuid", () => ({ v4: () => "test-uuid" }));

const API_OPERATION = "swagger/apiOperation";
const API_EXCLUDE_ENDPOINT = "swagger/apiExcludeEndpoint";
const API_TAGS = "swagger/apiUseTags";

const controllers = [
  AppController,
  AuthController,
  UsersController,
  BusinessAccountsController,
  BrandsController,
  CategoriesController,
  ProductsController,
  InventoriesController,
  FilesController,
  PurchaseRequestsController,
  TradeNetworkController,
];

describe("Swagger documentation", () => {
  it.each(controllers)("documents every route in %p", (ControllerClass) => {
    const prototype = ControllerClass.prototype as unknown as Record<
      string,
      unknown
    >;
    const routeNames = Object.getOwnPropertyNames(prototype).filter((name) => {
      const handler = prototype[name];
      return (
        typeof handler === "function" &&
        Reflect.hasMetadata(METHOD_METADATA, handler)
      );
    });

    expect(Reflect.getMetadata(API_TAGS, ControllerClass)).toBeDefined();
    expect(routeNames.length).toBeGreaterThan(0);

    for (const routeName of routeNames) {
      const handler = prototype[routeName];
      const excluded = Reflect.getMetadata(API_EXCLUDE_ENDPOINT, handler);

      if (excluded) {
        continue;
      }

      const operation = Reflect.getMetadata(API_OPERATION, handler) as
        | { summary?: string; description?: string }
        | undefined;

      expect(operation?.summary).toEqual(expect.any(String));
      expect(operation?.description).toEqual(expect.any(String));
    }
  });

  it("describes authentication and every API area", () => {
    const config = createSwaggerConfig();

    expect(config.info.description).toContain("Authorization: Bearer");
    expect(config.components?.securitySchemes?.bearer).toBeDefined();
    expect(config.tags?.map((tag) => tag.name)).toEqual([
      "App",
      "Auth",
      "Users",
      "Business Accounts",
      "Brands",
      "Categories",
      "Products",
      "Business Account Inventories",
      "Files",
      "Purchase Requests",
      "Trade Network",
    ]);
    expect(config.tags?.every((tag) => Boolean(tag.description))).toBe(true);
  });
});
