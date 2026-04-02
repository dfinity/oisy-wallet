import type {
	ProviderAgreementProvider,
	ProviderAgreementScope,
	ProviderAgreementType,
	UserAgreement as BackendUserAgreement
} from '$declarations/backend/backend.did';
import type {
	ProviderAgreementId,
	ProviderAgreementProviderId,
	ProviderAgreementScopeId,
	UserProviderAgreements
} from '$lib/types/user-provider-agreements';
import { mapBackendUserAgreement, mapUserAgreement } from '$lib/utils/agreements.utils';
import { assertNever } from '@dfinity/utils';

export const mapProviderKey = (provider: ProviderAgreementProvider): ProviderAgreementProviderId => {
	if ('NearIntents' in provider) {
		return 'NearIntents';
	}

	assertNever(provider, `Unknown ProviderAgreementProvider: ${JSON.stringify(provider)}`);
};

export const mapScopeKey = (scope: ProviderAgreementScope): ProviderAgreementScopeId => {
	if ('Swap' in scope) {
		return 'Swap';
	}

	assertNever(scope, `Unknown ProviderAgreementScope: ${JSON.stringify(scope)}`);
};

export const providerAgreementId = ({
	provider,
	scope
}: ProviderAgreementType): ProviderAgreementId =>
	`${mapProviderKey(provider)}-${mapScopeKey(scope)}`;

const providerIdToKey = (providerId: ProviderAgreementProviderId): ProviderAgreementProvider => {
	switch (providerId) {
		case 'NearIntents':
			return { NearIntents: null };
		default:
			assertNever(providerId, `Unknown ProviderAgreementProviderId: ${providerId}`);
	}
};

const scopeIdToKey = (scopeId: ProviderAgreementScopeId): ProviderAgreementScope => {
	switch (scopeId) {
		case 'Swap':
			return { Swap: null };
		default:
			assertNever(scopeId, `Unknown ProviderAgreementScopeId: ${scopeId}`);
	}
};

export const mapProviderAgreements = (
	backendProviderAgreements: Array<[ProviderAgreementType, BackendUserAgreement]>
): UserProviderAgreements =>
	backendProviderAgreements.reduce<UserProviderAgreements>(
		(acc, [providerAgreementType, backendUserAgreement]) => ({
			...acc,
			[providerAgreementId(providerAgreementType)]: mapUserAgreement(backendUserAgreement)
		}),
		{}
	);

export const mapBackendProviderAgreements = (
	providerAgreements: UserProviderAgreements
): Array<[ProviderAgreementType, BackendUserAgreement]> =>
	Object.entries(providerAgreements).reduce<Array<[ProviderAgreementType, BackendUserAgreement]>>(
		(acc, [key, agreementData]) => {
			const [providerId, scopeId] = key.split('-') as [
				ProviderAgreementProviderId,
				ProviderAgreementScopeId
			];

			return [
				...acc,
				[
					{
						provider: providerIdToKey(providerId),
						scope: scopeIdToKey(scopeId)
					},
					mapBackendUserAgreement(agreementData)
				]
			];
		},
		[]
	);
