import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import {
  ApiErrorResponse,
  AuthenticationErrors,
  NumericIdParam,
  ProtectedApi,
} from "../swagger/swagger.decorators";

export const ControllerDocs = () => ProtectedApi("Trade Network");

const agreementId = () => NumericIdParam("id", "Trade credit agreement ID");
const approvalId = () => NumericIdParam("id", "Credit approval request ID");

export const SearchOffers = () =>
  applyDecorators(
    ApiOperation({
      summary: "Search supplier offers",
      description:
        "Searches visible, active inventory offered by other businesses for the user's first active business membership. Supports text search, pagination, contract-only filtering, and relevance or price sorting; results indicate whether a credit agreement exists.",
    }),
    ApiOkResponse({
      description: "Paginated offers plus page and total metadata.",
    }),
    AuthenticationErrors(),
  );

export const GetOffer = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a supplier offer",
      description:
        "Returns a visible offer with product, supplier, stock, pricing, and active credit-contract context for the caller's buyer business.",
    }),
    NumericIdParam("id", "Store inventory offer ID"),
    ApiOkResponse({ description: "Supplier offer details." }),
    ApiNotFoundResponse({
      description: "The offer is unavailable or belongs to the buyer.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const CreateAgreement = () =>
  applyDecorators(
    ApiOperation({
      summary: "Propose a trade credit agreement",
      description:
        "Creates a pending agreement between different buyer and supplier businesses, with a credit limit and settlement terms. The caller must belong to the buyer business; both parties must sign before activation.",
    }),
    ApiCreatedResponse({ description: "The pending-signatures agreement." }),
    ApiBadRequestResponse({
      description: "The buyer and supplier are the same or a field is invalid.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const ListAgreements = () =>
  applyDecorators(
    ApiOperation({
      summary: "List trade credit agreements",
      description:
        "Returns paginated buyer or supplier agreements plus a server-side credit-limit, used-credit, available-credit, utilization, and active-agreement summary calculated independently of pagination.",
    }),
    ApiOkResponse({ description: "Paginated credit agreements." }),
    AuthenticationErrors(),
  );

export const GetAgreement = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get trade credit agreement details",
      description:
        "Returns parties, signatures, transactions, settlements, approvals, audit history, and available credit.",
    }),
    agreementId(),
    ApiOkResponse({ description: "Credit agreement details." }),
    ApiNotFoundResponse({
      description: "The trade credit agreement does not exist.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const UpdateAgreement = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update trade credit agreement terms",
      description:
        "Updates mutable settlement terms on an agreement visible to the selected party.",
    }),
    agreementId(),
    ApiOkResponse({ description: "The updated agreement." }),
    AuthenticationErrors(),
  );

export const AdjustCreditLimit = () =>
  applyDecorators(
    ApiOperation({
      summary: "Increase or decrease a credit limit",
      description:
        "Changes the limit without allowing it below current debt and records a ledger transaction and audit event.",
    }),
    agreementId(),
    ApiCreatedResponse({
      description: "Updated agreement and adjustment transaction.",
    }),
    ApiConflictResponse({
      description: "The requested limit would be below current debt.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const ListCreditTransactions = () =>
  applyDecorators(
    ApiOperation({
      summary: "List credit ledger transactions",
      description:
        "Returns a paginated, newest-first ledger with transaction codes, real agreement-party names, referenced product and business status, server-side filters, and totals calculated independently of pagination.",
    }),
    agreementId(),
    ApiOkResponse({ description: "Paginated credit transactions." }),
    AuthenticationErrors(),
  );

export const SignAgreement = () =>
  applyDecorators(
    ApiOperation({
      summary: "Sign a credit agreement for one party",
      description:
        "Records the authenticated user's signature for the buyer or supplier business they represent and timestamps that party's signature on the agreement.",
    }),
    agreementId(),
    ApiCreatedResponse({ description: "The recorded agreement signature." }),
    ApiNotFoundResponse({
      description: "The trade credit agreement does not exist.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const ActivateAgreement = () =>
  applyDecorators(
    ApiOperation({
      summary: "Activate a fully signed credit agreement",
      description:
        "Makes the agreement available for credit purchases after confirming that both buyer and supplier signatures exist. The caller must represent the buyer business.",
    }),
    agreementId(),
    ApiCreatedResponse({ description: "The active credit agreement." }),
    ApiNotFoundResponse({
      description: "The trade credit agreement does not exist.",
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({
      description: "One or both agreement parties have not signed.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const SuspendAgreement = () =>
  applyDecorators(
    ApiOperation({
      summary: "Suspend a credit agreement",
      description:
        "Disables an agreement for new credit purchases, records the supplied reason and suspension time, and appends an audit event. Existing debt is not cleared.",
    }),
    agreementId(),
    ApiCreatedResponse({ description: "The suspended credit agreement." }),
    ApiNotFoundResponse({
      description: "The trade credit agreement does not exist.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const CreateSettlement = () =>
  applyDecorators(
    ApiOperation({
      summary: "Open a settlement for current agreement debt",
      description:
        "Creates a pending settlement for the current calendar month using the agreement's current used credit as opening, net, and closing balance.",
    }),
    agreementId(),
    ApiCreatedResponse({ description: "The new pending settlement." }),
    ApiNotFoundResponse({
      description: "The trade credit agreement does not exist.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const ListPendingApprovals = () =>
  applyDecorators(
    ApiOperation({
      summary: "List pending over-limit purchase approvals",
      description:
        "Returns provisional invoices awaiting a decision by the selected supplier business. Active seller membership and read permission are required.",
    }),
    ApiOkResponse({ description: "Pending approval requests.", isArray: true }),
    AuthenticationErrors(),
  );

export const ApproveOverLimitTrade = () =>
  applyDecorators(
    ApiOperation({
      summary: "Approve an over-limit credit purchase",
      description:
        "Lets the owning supplier activate the provisional invoice, consume only its reserved stock, increase agreement debt, and record the credit transaction atomically.",
    }),
    approvalId(),
    ApiCreatedResponse({
      description: "The approved request and activated invoice.",
    }),
    ApiNotFoundResponse({
      description: "The approval or linked purchase request does not exist.",
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({
      description:
        "The approval is already closed, the purchase is no longer pending, or stock cannot be consumed.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );

export const RejectOverLimitTrade = () =>
  applyDecorators(
    ApiOperation({
      summary: "Reject an over-limit credit purchase",
      description:
        "Lets the owning supplier reject the provisional invoice, releases only that invoice's reserved stock, and leaves other supplier invoices unchanged.",
    }),
    approvalId(),
    ApiCreatedResponse({ description: "The rejected approval request." }),
    ApiNotFoundResponse({
      description: "The approval or linked purchase request does not exist.",
      type: ApiErrorResponse,
    }),
    ApiConflictResponse({
      description:
        "The approval is closed or reserved stock cannot be released.",
      type: ApiErrorResponse,
    }),
    AuthenticationErrors(),
  );
