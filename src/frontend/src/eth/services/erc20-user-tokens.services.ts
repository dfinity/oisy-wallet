import { loadErc20UserTokens } from '$eth/services/erc20.services';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { toUserToken } from '$icp-eth/services/user-token.services';
import { setManyUserTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export type SaveUserToken = Pick<
	Erc20UserToken,
	'enabled' | 'version' | 'symbol' | 'decimals' | 'address' | 'network'
> &
	Partial<Pick<Erc20UserToken, 'id'>>;

export const saveUserTokens = async ({
	progress,
	identity,
	tokens
}: SaveTokensParams<SaveUserToken>) => {
	progress?.(ProgressStepsAddToken.SAVE);

	await setManyUserTokens({
		identity,
		tokens: tokens.map(toUserToken),
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	progress?.(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled, id }) => !enabled && nonNullish(id));
	disabledTokens.forEach(({ id }) => erc20UserTokensStore.reset(id as TokenId));

	// TODO(GIX-2740): reload only what's needed to spare Infura calls
	// Reload all user tokens for simplicity reason.
	await loadErc20UserTokens({ identity });
};
