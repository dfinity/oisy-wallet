import type { UserCredential, UserProfile } from '$declarations/backend/backend.did';
import {
	INTERNET_IDENTITY_ORIGIN,
	POUH_ISSUER_CANISTER_ID,
	POUH_ISSUER_ORIGIN
} from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { userProfileStore } from '$lib/stores/settings.store';
import { toastsError } from '$lib/stores/toasts.store';
import { Principal } from '@dfinity/principal';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	requestVerifiablePresentation,
	type VerifiablePresentationResponse
} from '@dfinity/verifiable-credentials/request-verifiable-presentation';
import { get } from 'svelte/store';

// This credential type is defined by the issuer Decide AI
const POUH_CREDENTIAL_TYPE = 'ProofOfUniqueness';

const handleSuccess = async (
	response: VerifiablePresentationResponse
): Promise<{ success: boolean }> => {
	const { auth: authI18n } = get(i18n);
	if ('Ok' in response) {
		// TODO: GIX-2646 Add credential to backend and load user profile
		const fakeTemporaryCredentialSummary: UserCredential = {
			credential_type: { [POUH_CREDENTIAL_TYPE]: null },
			verified_date_timestamp: [BigInt(Date.now())]
		};
		const fakeUserProfile: UserProfile = {
			credentials: [fakeTemporaryCredentialSummary],
			created_timestamp: BigInt(Date.now()),
			updated_timestamp: BigInt(Date.now()),
			version: [0n]
		};
		userProfileStore.set({ key: 'user-profile', value: fakeUserProfile });
		return { success: true };
	}
	toastsError({
		msg: { text: authI18n.error.no_pouh_credential }
	});
	return { success: false };
};

export const requestPouhCredential = async ({
	credentialSubject
}: {
	credentialSubject: Principal;
}): Promise<{ success: boolean }> => {
	const { auth: authI18n } = get(i18n);
	return new Promise((resolve, reject) => {
		const issuerCanisterId = nonNullish(POUH_ISSUER_CANISTER_ID)
			? Principal.fromText(POUH_ISSUER_CANISTER_ID)
			: undefined;
		if (isNullish(POUH_ISSUER_ORIGIN) || isNullish(issuerCanisterId)) {
			toastsError({
				msg: { text: authI18n.error.missing_pouh_issuer_origin }
			});
			resolve({ success: false });
			return;
		}
		requestVerifiablePresentation({
			issuerData: {
				origin: POUH_ISSUER_ORIGIN,
				canisterId: issuerCanisterId
			},
			identityProvider: new URL(INTERNET_IDENTITY_ORIGIN),
			credentialData: {
				credentialSpec: {
					credentialType: POUH_CREDENTIAL_TYPE,
					arguments: {}
				},
				credentialSubject
			},
			onError() {
				toastsError({
					msg: { text: authI18n.error.error_requesting_pouh_credential }
				});
				reject();
			},
			onSuccess: async (response: VerifiablePresentationResponse) => {
				resolve(await handleSuccess(response));
			}
		});
	});
};
