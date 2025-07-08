import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { nonNullish } from '@dfinity/utils';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import type { TokenId } from '$lib/types/token';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { get } from 'svelte/store';
import { i18n } from '$lib/stores/i18n.store';
import type { CustomToken } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';

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

	const customTokens: CustomToken[] = tokens.map((token) => toCustomToken({
		...token,
		chainId: ETHEREUM_NETWORK.chainId,
		networkKey: 'Erc721'
	}))

	console.log(customTokens)

	// TODO save
	// const wusch = tokens.map(toCustomToken)
	// console.log(wusch)

	// await setManyCustomTokens({
	// 	identity,
	// 	tokens: tokens.map(toCustomToken),
	// 	nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	// });

	progress?.(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled, id }) => !enabled && nonNullish(id));
	disabledTokens.forEach(({id}) => erc721CustomTokensStore.reset(id as TokenId));

	// TODO(GIX-2740): reload only what's needed to spare Infura calls
	// Reload all user tokens for simplicity reason.
	// TODO load
};