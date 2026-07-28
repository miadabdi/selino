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
