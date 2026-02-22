import {
  Action,
  checkSubjectByParam,
  type PolicyContext,
  type PolicyHandler,
} from "../auth/casl/index.js";
import { PurchaseRequestsService } from "./purchase-requests.service.js";

function toPurchaseRequestSubject(requesterId: number | null) {
  if (requesterId == null) {
    return null;
  }

  return { requesterId };
}

function checkPurchaseRequestByParam(
  paramKey: string,
  resolveRequesterId: (
    purchaseRequestsService: PurchaseRequestsService,
    id: number,
    context: PolicyContext,
  ) => Promise<number | null> | number | null,
): PolicyHandler {
  return checkSubjectByParam({
    serviceToken: PurchaseRequestsService,
    paramKey,
    action: Action.Update,
    subjectType: "PurchaseRequest",
    resolveSubject: async (purchaseRequestsService, id, context) =>
      toPurchaseRequestSubject(
        await resolveRequesterId(purchaseRequestsService, id, context),
      ),
  });
}

export const PurchaseRequestPolicies = {
  updateByRequestId: checkPurchaseRequestByParam(
    "id",
    (purchaseRequestsService, id) =>
      purchaseRequestsService.getRequesterIdById(id),
  ),
  updateByItemId: checkPurchaseRequestByParam(
    "itemId",
    (purchaseRequestsService, itemId) =>
      purchaseRequestsService.getRequesterIdByItemId(itemId),
  ),
};
