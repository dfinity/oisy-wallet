import type {
	ProviderAgreementProvider,
	ProviderAgreementScope
} from '$declarations/backend/backend.did';
import type { AgreementData } from '$lib/types/user-agreements';

export type ProviderAgreementProviderId = keyof ProviderAgreementProvider;
export type ProviderAgreementScopeId = keyof ProviderAgreementScope;

export type ProviderAgreementId = `${ProviderAgreementProviderId}-${ProviderAgreementScopeId}`;

export type UserProviderAgreements = Partial<Record<ProviderAgreementId, AgreementData>>;
