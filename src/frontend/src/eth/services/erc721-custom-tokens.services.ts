import type { CustomToken } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { loadCustomTokens } from '$eth/services/erc721.services';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import type { TokenId } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export type SaveErc721CustomToken = Pick<
	Erc721CustomToken,
	'enabled' | 'version' | 'symbol' | 'address' | 'network'
> &
	Partial<Pick<Erc721CustomToken, 'id'>>;

export const saveCustomTokens = async ({
	progress,
	identity,
	tokens
}: SaveTokensParams<SaveErc721CustomToken>) => {
	progress?.(ProgressStepsAddToken.SAVE);

	const customTokens: CustomToken[] = tokens.map((token) =>
		toCustomToken({
			...token,
			chainId: ETHEREUM_NETWORK.chainId,
			networkKey: 'Erc721'
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
	disabledTokens.forEach(({ id }) => erc721CustomTokensStore.reset(id as TokenId));

	// Reload all user tokens for simplicity reason.
	await loadCustomTokens({ identity });
};
