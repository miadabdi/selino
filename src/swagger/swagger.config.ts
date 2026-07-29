import { DocumentBuilder } from "@nestjs/swagger";

export function createSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle("Selino API")
    .setDescription(
      [
        "Backend API for Selino's business marketplace, inventory, purchasing, and trade-credit workflows.",
        "",
        "Protected endpoints require an access token in the `Authorization: Bearer <token>` header. Obtain tokens by verifying a phone OTP or completing Google sign-in, and rotate them with the refresh endpoint.",
        "",
        "Validation errors use `{ error, field? }`. Monetary values are currently represented as numbers and default to IRR unless an endpoint says otherwise.",
      ].join("\n"),
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT access token returned by an authentication endpoint",
      },
      "bearer",
    )
    .addTag("App", "Service discovery and health endpoints.")
    .addTag("Auth", "Sign in, verify contact details, and manage sessions.")
    .addTag("Users", "Read and update the authenticated user's profile.")
    .addTag(
      "Business Accounts",
      "Create businesses, update their public details, and manage memberships.",
    )
    .addTag("Brands", "Manage the product brand catalog.")
    .addTag(
      "Categories",
      "Manage the category hierarchy and category-specific product specifications.",
    )
    .addTag(
      "Products",
      "Search and manage the shared product catalog and images.",
    )
    .addTag(
      "Business Account Inventories",
      "Manage a business's sellable product inventory, stock, and stock ledger.",
    )
    .addTag("Files", "Create direct-upload intents and manage uploaded files.")
    .addTag(
      "Purchase Requests",
      "Build, confirm, or cancel the authenticated user's active purchase request.",
    )
    .addTag(
      "Trade Network",
      "Discover suppliers and manage credit agreements, approvals, and settlements.",
    )
    .addTag("Invoices", "Read, export, and advance invoice lifecycles.")
    .addTag("Dashboard", "Business KPI and trend aggregates.")
    .addTag("Wallets", "Business balances and wallet ledger transactions.")
    .addTag("Payments", "Provider-neutral payment and refund workflows.")
    .addTag("Orders", "Order lifecycle and fulfillment status.")
    .addTag("Shipments", "Shipment details, locations, delays, and delivery.")
    .addTag("Suppliers", "Supplier onboarding and business relationships.")
    .addTag("Reports", "Performance reporting and exports.")
    .addTag("Notifications", "Notification inbox and delivery preferences.")
    .addTag("Support", "Support tickets, messages, and resolution.")
    .build();
}
