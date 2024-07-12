import {
	INTERNET_IDENTITY_ORIGIN,
	POH_ISSUER_CANISTER_ID,
	POH_ISSUER_ORIGIN
} from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { userProfileStore, type UserProfile } from '$lib/stores/settings.store';
import { toastsError } from '$lib/stores/toasts.store';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	requestVerifiablePresentation,
	type VerifiablePresentationResponse
} from '@dfinity/verifiable-credentials/request-verifiable-presentation';
import { get } from 'svelte/store';

// This credential type is defined by the issuer Decide AI
const POH_CREDENTIAL_TYPE = 'ProofOfUniqueness';

const handleSuccess = async (
	response: VerifiablePresentationResponse
): Promise<{ success: boolean }> => {
	const { auth: authI18n } = get(i18n);
	if ('Ok' in response) {
		// TODO: GIX-2646 Add credential to backend and load user profile
		const fakeTemporaryCredentialSummary = {
			credential_type: POH_CREDENTIAL_TYPE,
			verified_date_timestamp: BigInt(Date.now()),
			expire_date_timestamp: BigInt(Date.now() + 1000 * 60 * 60 * 24 * 365)
		};
		const fakeUserProfile: UserProfile = {
			credentials: {
				[POH_CREDENTIAL_TYPE]: fakeTemporaryCredentialSummary
			},
			created_timestamp: BigInt(Date.now()),
			updated_timestamp: BigInt(Date.now())
		};
		userProfileStore.set({ key: 'user-profile', value: fakeUserProfile });
		return { success: true };
	}
	toastsError({
		msg: { text: authI18n.error.no_poh_credential }
	});
	return { success: false };
};

export const requestPohCredential = async ({
	credentialSubject
}: {
	credentialSubject: Principal;
}): Promise<{ success: boolean }> => {
	const { auth: authI18n } = get(i18n);
	return new Promise((resolve, reject) => {
		const issuerCanisterId = nonNullish(POH_ISSUER_CANISTER_ID)
			? Principal.fromText(POH_ISSUER_CANISTER_ID)
			: undefined;
		if (isNullish(POH_ISSUER_ORIGIN) || isNullish(issuerCanisterId)) {
			toastsError({
				msg: { text: authI18n.error.missing_poh_issuer_origin }
			});
			resolve({ success: false });
			return;
		}
		requestVerifiablePresentation({
			issuerData: {
				origin: POH_ISSUER_ORIGIN,
				canisterId: issuerCanisterId
			},
			identityProvider: new URL(INTERNET_IDENTITY_ORIGIN),
			credentialData: {
				credentialSpec: {
					credentialType: POH_CREDENTIAL_TYPE,
					arguments: {}
				},
				credentialSubject
			},
			onError() {
				toastsError({
					msg: { text: authI18n.error.error_requesting_poh_credential }
				});
				reject();
			},
			onSuccess: async (response: VerifiablePresentationResponse) => {
				resolve(await handleSuccess(response));
			}
		});
	});
};
