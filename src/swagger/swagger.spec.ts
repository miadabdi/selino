import { METHOD_METADATA } from "@nestjs/common/constants";
import { AppController } from "../app.controller";
import { AuthController } from "../auth/auth.controller";
import { BrandsController } from "../brands/brands.controller";
import { BusinessAccountsController } from "../business-accounts/business-accounts.controller";
import { CategoriesController } from "../categories/categories.controller";
import { DashboardController } from "../dashboard/dashboard.controller";
import { FilesController } from "../files/files.controller";
import { InventoriesController } from "../inventories/inventories.controller";
import { InvoicesController } from "../invoices/invoices.controller";
import { NotificationController } from "../notification/notification.controller";
import { OrdersController } from "../orders/orders.controller";
import { PaymentsController } from "../payments/payments.controller";
import { ProductsController } from "../products/products.controller";
import { PurchaseRequestsController } from "../purchase-requests/purchase-requests.controller";
import { ReportsController } from "../reports/reports.controller";
import { ShipmentsController } from "../shipments/shipments.controller";
import { SuppliersController } from "../suppliers/suppliers.controller";
import { SupportController } from "../support/support.controller";
import { TradeNetworkController } from "../trade-network/trade-network.controller";
import { UsersController } from "../users/users.controller";
import { WalletsController } from "../wallets/wallets.controller";
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
  InvoicesController,
  DashboardController,
  WalletsController,
  PaymentsController,
  OrdersController,
  ShipmentsController,
  SuppliersController,
  ReportsController,
  NotificationController,
  SupportController,
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
      if (!operation?.description) {
        throw new Error(
          `${ControllerClass.name}.${routeName} must document its behavior`,
        );
      }
      expect(operation.description).toEqual(expect.any(String));
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
      "Invoices",
      "Dashboard",
      "Wallets",
      "Payments",
      "Orders",
      "Shipments",
      "Suppliers",
      "Reports",
      "Notifications",
      "Support",
    ]);
    expect(config.tags?.every((tag) => Boolean(tag.description))).toBe(true);
  });
});
