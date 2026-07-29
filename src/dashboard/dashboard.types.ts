export type DashboardRange = {
  from: Date;
  to: Date;
};

export type DashboardOverview = {
  range: {
    from: string;
    to: string;
  };
  summary: {
    salesAmount: number;
    purchaseAmount: number;
    activeOrders: number;
    completedOrders: number;
    walletBalance: number;
    creditLimit: number;
    usedCredit: number;
    availableCredit: number;
    currency: string;
  };
  sellerSummary: {
    newPurchaseRequests: number;
    pendingCreditPurchaseRequests: number;
    confirmedPurchaseRequests: number;
    cancelledPurchaseRequests: number;
    activePurchaseInvoices: number;
    historicalPurchaseInvoices: number;
    paidPurchaseInvoices: number;
    pendingPurchaseInvoices: number;
    sentPurchaseInvoices: number;
    todayPaidPurchaseInvoices: number;
    todayActivePurchaseInvoices: number;
    todayPendingPurchaseInvoices: number;
    todaySentPurchaseInvoices: number;
    outstandingPurchaseAmount: number;
    walletBalance: number;
    currency: string;
  };
  managerSummary: {
    salesAmount: number;
    purchaseAmount: number;
    activeOrders: number;
    completedOrders: number;
    walletBalance: number;
    creditLimit: number;
    usedCredit: number;
    availableCredit: number;
    currency: string;
  };
  managerKpis: {
    todaySalesAmount: number;
    todaySalesComparisonPercent: number | null;
    currentMonthOrderCount: number;
    currentMonthOrderComparisonPercent: number | null;
    currentMonthRevenue: number;
    currentMonthRevenueComparisonPercent: number | null;
    periodOrderCount: number;
    orderCountComparisonPercent: number | null;
    periodRevenue: number;
    revenueComparisonPercent: number | null;
    currency: string;
  };
  salesTrend: Array<{
    date: string;
    amount: number;
    orderCount: number;
    purchaseAmount: number;
    deliveredOrderCount: number;
    averageOrderValue: number;
  }>;
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    invoiceId: number;
    invoiceNumber: string;
    counterpartyName: string;
    buyerName: string;
    supplierName: string;
    status: string;
    itemCount: number;
    quantity: number;
    totalAmount: number;
    currency: string;
    createdAt: Date;
    shipmentId: number | null;
    shipmentStatus: string | null;
    estimatedDeliveryAt: Date | null;
  }>;
  topSuppliers: Array<{
    id: number;
    name: string;
    city: string | null;
    activeOrders: number;
    totalPurchased: number;
  }>;
  topProducts: Array<{
    id: number;
    name: string;
    productCode: string;
    model: string | null;
    defaultImageFileId: number | null;
    attributes: Record<string, unknown> | null;
    supplierName: string;
    supplierNames: string[];
    quantity: number;
    totalAmount: number;
  }>;
  managerPerformance: Array<{
    key: "sales" | "orders" | "averageOrderValue" | "fulfillmentRate";
    value: number;
    previousValue: number;
    changePercent: number | null;
  }>;
};
