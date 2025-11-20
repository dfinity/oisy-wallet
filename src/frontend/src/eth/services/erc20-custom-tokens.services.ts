import type { CustomToken } from '$declarations/backend/backend.did';
import { loadCustomTokens } from '$eth/services/erc20.services';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import type { SaveErc20CustomToken } from '$eth/types/erc20-custom-token';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import type { TokenId } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const saveCustomTokens = async ({
	progress,
	identity,
	tokens
}: SaveTokensParams<SaveErc20CustomToken>) => {
	progress?.(ProgressStepsAddToken.SAVE);

	const customTokens: CustomToken[] = tokens.map((token) =>
		toCustomToken({
			...token,
			chainId: token.network.chainId,
			networkKey: 'Erc20'
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
	disabledTokens.forEach(({ id }) => erc20CustomTokensStore.reset(id as TokenId));

	// Reload all user tokens for simplicity reason.
	await loadCustomTokens({ identity });
};
