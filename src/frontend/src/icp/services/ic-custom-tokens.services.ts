import { loadCustomTokens } from '$icp/services/icrc.services';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { get } from 'svelte/store';

export const saveCustomTokens = async ({
	progress,
	identity,
	tokens
}: SaveTokensParams<SaveCustomTokenWithKey>) => {
	progress?.(ProgressStepsAddToken.SAVE);

	await setManyCustomTokens({
		identity,
		tokens: tokens.map(toCustomToken),
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	progress?.(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled }) => !enabled);
	disabledTokens.forEach((token) =>
		token.networkKey === 'Icrc' ? icrcCustomTokensStore.reset(token.ledgerCanisterId) : null
	);

	// Reload all custom tokens for simplicity reason.
	await loadCustomTokens({ identity });
};
