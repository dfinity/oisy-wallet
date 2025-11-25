import type { CustomToken } from '$declarations/backend/backend.did';
import { ICP_NETWORK, ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { loadCustomTokens } from '$icp/services/ext.services';
import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import type { SaveExtCustomToken } from '$icp/types/ext-custom-token';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import type { CanisterIdText } from '$lib/types/canister';
import type { TokenId } from '$lib/types/token';
import type { NonEmptyArray } from '$lib/types/utils';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

export const saveCustomTokens = async ({
	progress,
	identity,
	tokens
}: SaveTokensParams<SaveExtCustomToken>) => {
	progress?.(ProgressStepsAddToken.SAVE);

	const customTokens: CustomToken[] = tokens.map((token) =>
		toCustomToken({
			...token,
			networkKey: 'ExtV2'
		})
	);

	await setManyCustomTokens({
		identity,
		tokens: customTokens,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	progress?.(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled, id }) => !enabled && nonNullish(id));
	disabledTokens.forEach(({ id }) => extCustomTokensStore.reset(id as TokenId));

	// Reload all user tokens for simplicity reason.
	await loadCustomTokens({ identity });
};

export const saveExtCustomTokens = async ({
	canisterIds,
	customTokens,
	identity
}: {
	canisterIds: CanisterIdText[];
	customTokens: CustomToken[];
	identity: Identity;
}) => {
	const extTokens = canisterIds.reduce<SaveExtCustomToken[]>((acc, canisterId) => {
		const existingToken = customTokens.find(({ token }) => {
			if (!('ExtV2' in token)) {
				return false;
			}

			const {
				ExtV2: { canister_id: existingCanisterId }
			} = token;

			return areAddressesEqual({
				address1: existingCanisterId.toString(),
				address2: canisterId,
				networkId: ICP_NETWORK_ID
			});
		});

		if (nonNullish(existingToken)) {
			return acc;
		}

		const newToken: SaveExtCustomToken = {
			canisterId,
			network: ICP_NETWORK,
			enabled: true
		};

		acc.push(newToken);

		return acc;
	}, []);

	if (extTokens.length === 0) {
		return;
	}

	await saveCustomTokens({
		tokens: extTokens as NonEmptyArray<SaveExtCustomToken>,
		identity
	});
};
