import { loadCustomTokens as loadCustomErc1155Tokens } from '$eth/services/erc1155.services';
import { loadCustomTokens as loadCustomErc20Tokens } from '$eth/services/erc20.services';
import { loadCustomTokens as loadCustomErc721Tokens } from '$eth/services/erc721.services';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import { loadCustomTokens as loadCustomExtTokens } from '$icp/services/ext.services';
import { loadCustomTokens as loadCustomIcPunksTokens } from '$icp/services/icpunks.services';
import { loadCustomTokens as loadCustomIcrcTokens } from '$icp/services/icrc.services';
import { dip721CustomTokensStore } from '$icp/stores/dip721-custom-tokens.store';
import { extCustomTokensStore } from '$icp/stores/ext-custom-tokens.store';
import { icPunksCustomTokensStore } from '$icp/stores/icpunks-custom-tokens.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import type { SaveTokensParams } from '$lib/services/manage-tokens.services';
import { i18n } from '$lib/stores/i18n.store';
import type { SaveCustomErcVariant, SaveCustomTokenWithKey } from '$lib/types/custom-token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { loadCustomTokens as loadCustomSplTokens } from '$sol/services/spl.services';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { assertNever } from '@dfinity/utils';
import { get } from 'svelte/store';

const parseErcIdentifier = (token: SaveCustomErcVariant) => `${token.address}#${token.chainId}`;

const hideTokenByKey = (token: SaveCustomTokenWithKey) => {
	if (token.networkKey === 'Icrc') {
		icrcCustomTokensStore.resetByIdentifier(token.ledgerCanisterId);

		return;
	}

	if (token.networkKey === 'ExtV2') {
		extCustomTokensStore.resetByIdentifier(token.canisterId);

		return;
	}

	if (token.networkKey === 'Dip721') {
		dip721CustomTokensStore.resetByIdentifier(token.canisterId);

		return;
	}

	if (token.networkKey === 'IcPunks') {
		icPunksCustomTokensStore.resetByIdentifier(token.canisterId);

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
	await Promise.all([
		loadCustomErc20Tokens({ identity }),
		loadCustomErc721Tokens({ identity }),
		loadCustomErc1155Tokens({ identity }),
		loadCustomIcrcTokens({ identity }),
		loadCustomExtTokens({ identity }),
		// TODO: add loadCustomDip721Tokens here (and in the tests)
		loadCustomIcPunksTokens({ identity }),
		loadCustomSplTokens({ identity })
	]);
};
