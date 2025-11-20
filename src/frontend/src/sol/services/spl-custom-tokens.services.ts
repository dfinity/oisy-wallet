import type { CustomToken } from '$declarations/backend/backend.did';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import type { TokenId } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { isNetworkIdSOLDevnet } from '$lib/utils/network.utils';
import { loadCustomTokens } from '$sol/services/spl.services';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import type { SaveSplCustomToken } from '$sol/types/spl-custom-token';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const saveCustomTokens = async ({
	progress,
	identity,
	tokens
}: SaveTokensParams<SaveSplCustomToken>) => {
	progress?.(ProgressStepsAddToken.SAVE);

	const customTokens: CustomToken[] = tokens.map((token) =>
		toCustomToken({
			...token,
			networkKey: isNetworkIdSOLDevnet(token.network.id) ? 'SplDevnet' : 'SplMainnet'
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
	disabledTokens.forEach(({ id }) => splCustomTokensStore.reset(id as TokenId));

	// Reload all user tokens for simplicity reason.
	await loadCustomTokens({ identity });
};
