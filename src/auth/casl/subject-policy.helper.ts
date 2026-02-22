import { subject } from "@casl/ability";
import { Action } from "./actions.enum.js";
import type {
  PolicyContext,
  PolicyHandler,
  ServiceToken,
} from "./policies.decorator.js";

export interface CheckSubjectByParamOptions<
  TService,
  TSubject extends Record<string, unknown>,
> {
  serviceToken: ServiceToken<TService>;
  paramKey: string;
  action: Action;
  subjectType: string;
  resolveSubject: (
    service: TService,
    id: number,
    context: PolicyContext,
  ) => Promise<TSubject | null> | TSubject | null;
}

export function checkSubjectByParam<
  TService,
  TSubject extends Record<string, unknown>,
>(options: CheckSubjectByParamOptions<TService, TSubject>): PolicyHandler {
  return async (ability, request, context) => {
    const rawId = request.params[options.paramKey];
    if (rawId == null) {
      return false;
    }

    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return false;
    }

    const service = context.getService(options.serviceToken);
    const subjectData = await options.resolveSubject(service, id, context);
    if (!subjectData) {
      return false;
    }

    return ability.can(
      options.action,
      subject(options.subjectType, subjectData),
    );
  };
}
