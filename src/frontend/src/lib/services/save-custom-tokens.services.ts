import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import { loadCustomTokens } from '$icp/services/icrc.services';
import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import type {
	ErcSaveCustomToken,
	SaveCustomTokenWithKey,
	TokenVariant
} from '$lib/types/custom-token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { assertNever } from '@dfinity/utils';
import { get } from 'svelte/store';

const parseErcIdentifier = (
	token: TokenVariant<'Erc20' | 'Erc721' | 'Erc1155', ErcSaveCustomToken>
) => `${token.address}#${token.chainId}`;

const hideTokenByKey = (token: SaveCustomTokenWithKey) => {
	if (token.networkKey === 'Icrc') {
		icrcCustomTokensStore.resetByIdentifier(token.ledgerCanisterId);

		return;
	}

	if (token.networkKey === 'ExtV2') {
		extCustomTokensStore.resetByIdentifier(token.canisterId);

		return;
	}

	if (token.networkKey === 'Erc20') {
		erc20CustomTokensStore.resetByIdentifier(parseErcIdentifier(token));

		return;
	}

	if (token.networkKey === 'Erc721') {
		erc721CustomTokensStore.resetByIdentifier(parseErcIdentifier(token));

		return;
	}

	if (token.networkKey === 'Erc1155') {
		erc1155CustomTokensStore.resetByIdentifier(parseErcIdentifier(token));

		return;
	}

	if (token.networkKey === 'SplMainnet' || token.networkKey === 'SplDevnet') {
		splCustomTokensStore.resetByIdentifier(token.address);

		return;
	}

	assertNever(token.networkKey, `Unexpected networkKey: ${token.networkKey}`);
};

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
	disabledTokens.forEach(hideTokenByKey);

	// Reload all custom tokens for simplicity reason.
	await loadCustomTokens({ identity });
};
