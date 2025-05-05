import { addUserCredential } from '$lib/api/backend.api';
import {
	INTERNET_IDENTITY_ORIGIN,
	POUH_ISSUER_CANISTER_ID,
	POUH_ISSUER_ORIGIN,
	VC_POPUP_HEIGHT,
	VC_POPUP_WIDTH
} from '$lib/constants/app.constants';
import { POUH_CREDENTIAL_TYPE } from '$lib/constants/credentials.constants';
import { loadCertifiedUserProfile } from '$lib/services/load-user-profile.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { ResultSuccess } from '$lib/types/utils';
import { getOptionalDerivationOrigin } from '$lib/utils/auth.utils';
import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';
import { popupCenter } from '$lib/utils/window.utils';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { fromNullishNullable, isNullish, nonNullish } from '@dfinity/utils';
import {
	requestVerifiablePresentation,
	type VerifiablePresentationResponse
} from '@dfinity/verifiable-credentials/request-verifiable-presentation';
import { get } from 'svelte/store';

const addPouhCredential = async ({
	identity,
	credentialJwt,
	issuerCanisterId
}: {
	identity: Identity;
	credentialJwt: string;
	issuerCanisterId: Principal;
}): Promise<ResultSuccess> => {
	const { auth: authI18n } = get(i18n);
	try {
		const userProfile = get(userProfileStore);
		const response = await addUserCredential({
			identity,
			credentialJwt,
			credentialSpec: {
				credential_type: POUH_CREDENTIAL_TYPE,
				arguments: []
			},
			issuerCanisterId,
			currentUserVersion: fromNullishNullable(userProfile?.profile.version),
			nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
		});
		if ('Ok' in response) {
			return { success: true };
		}
		if ('Err' in response) {
			if ('InvalidCredential' in response.Err) {
				toastsError({
					msg: { text: authI18n.error.invalid_pouh_credential }
				});
				return { success: false };
			}
			const [errorKey] = Object.keys(response.Err);
			toastsError({
				msg: {
					text: replacePlaceholders(
						replaceOisyPlaceholders(authI18n.error.error_validating_pouh_credential_oisy),
						{
							$error: errorKey
						}
					)
				}
			});
		}
	} catch (err: unknown) {
		toastsError({
			msg: { text: authI18n.error.error_validating_pouh_credential },
			err
		});
	}
	return { success: false };
};

const handleSuccess = async ({
	response,
	identity,
	issuerCanisterId
}: {
	response: VerifiablePresentationResponse;
	identity: Identity;
	issuerCanisterId: Principal;
}): Promise<ResultSuccess> => {
	const { auth: authI18n } = get(i18n);
	if ('Ok' in response) {
		const { success } = await addPouhCredential({
			credentialJwt: response.Ok,
			identity,
			issuerCanisterId
		});
		if (success) {
			await loadCertifiedUserProfile({ identity });
		}
		return { success: true };
	}
	toastsError({
		msg: { text: authI18n.error.no_pouh_credential }
	});
	return { success: false };
};

export const requestPouhCredential = ({
	identity
}: {
	identity: Identity;
}): Promise<ResultSuccess> => {
	const credentialSubject = identity.getPrincipal();
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
			onError: () => {
				toastsError({
					msg: { text: authI18n.error.error_requesting_pouh_credential }
				});
				reject();
			},
			onSuccess: async (response: VerifiablePresentationResponse) => {
				resolve(await handleSuccess({ response, identity, issuerCanisterId }));
			},
			windowOpenerFeatures: popupCenter({ width: VC_POPUP_WIDTH, height: VC_POPUP_HEIGHT }),
			...getOptionalDerivationOrigin()
		});
	});
};
