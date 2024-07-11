import {
	INTERNET_IDENTITY_CANISTER_ID,
	POH_ISSUER_CANISTER_ID
} from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { userProfileStore, type UserProfile } from '$lib/stores/settings.store';
import { toastsError } from '$lib/stores/toasts.store';
import { Principal } from '@dfinity/principal';
import {
	requestVerifiablePresentation,
	type VerifiablePresentationResponse
} from '@dfinity/verifiable-credentials/request-verifiable-presentation';
import { get } from 'svelte/store';

// TODO: Move to env vars
const ISSUER_ORIGIN = `http://${POH_ISSUER_CANISTER_ID}.localhost:4943`;
const IDENTITY_PROVIDER_ORIGIN = `http://${INTERNET_IDENTITY_CANISTER_ID}.localhost:4943`;

const POH_CREDENTIAL_TYPE = 'ProofOfUniqueness';

export const requestPouhCredential = async ({
	credentialSubject
}: {
	credentialSubject: Principal;
}): Promise<boolean> => {
	const i18Copy = get(i18n);
	return new Promise((resolve, reject) => {
		requestVerifiablePresentation({
			issuerData: {
				origin: ISSUER_ORIGIN,
				canisterId: Principal.fromText(POH_ISSUER_CANISTER_ID)
			},
			identityProvider: new URL(IDENTITY_PROVIDER_ORIGIN),
			credentialData: {
				credentialSpec: {
					credentialType: POH_CREDENTIAL_TYPE,
					arguments: {}
				},
				credentialSubject
			},
			onError() {
				toastsError({
					msg: { text: i18Copy.auth.error.error_requesting_poh_credential }
				});
				reject();
			},
			onSuccess(response: VerifiablePresentationResponse) {
				if ('Ok' in response) {
					// TODO: GIX-2646 Add credential to backend and load user profile
					const fakeCredentialSummary = {
						credential_type: POH_CREDENTIAL_TYPE,
						verified_date_timestamp: BigInt(Date.now()),
						expire_date_timestamp: BigInt(Date.now() + 1000 * 60 * 60 * 24 * 365)
					};
					const fakeUserProfile: UserProfile = {
						credentials: {
							[POH_CREDENTIAL_TYPE]: fakeCredentialSummary
						},
						created_timestamp: BigInt(Date.now()),
						updated_timestamp: BigInt(Date.now())
					};
					userProfileStore.set({ key: 'user-profile', value: fakeUserProfile });
					resolve(true);
					return;
				}
				toastsError({
					msg: { text: i18Copy.auth.error.no_poh_credential }
				});
				resolve(false);
			}
		});
	});
};
