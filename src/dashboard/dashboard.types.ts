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
  salesTrend: Array<{
    date: string;
    amount: number;
    orderCount: number;
  }>;
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    invoiceId: number;
    invoiceNumber: string;
    counterpartyName: string;
    status: string;
    totalAmount: number;
    currency: string;
    createdAt: Date;
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
    supplierName: string;
    quantity: number;
    totalAmount: number;
  }>;
};
