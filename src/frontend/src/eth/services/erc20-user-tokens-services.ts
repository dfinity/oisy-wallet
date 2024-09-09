import { loadUserTokens } from '$eth/services/erc20.services';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import { setManyUserTokens } from '$lib/api/backend.api';
import { ProgressStepsAddToken } from '$lib/enums/progress-steps';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { assertNonNullish, nonNullish, toNullable } from '@dfinity/utils';
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
}: {
	progress: (step: ProgressStepsAddToken) => void;
	identity: Identity;
	tokens: SaveUserToken[];
}) => {
	progress(ProgressStepsAddToken.SAVE);

	await setManyUserTokens({
		identity,
		tokens: tokens.map(
			({ enabled, version, symbol, decimals, address: contract_address, network }) => ({
				contract_address,
				chain_id: (network as EthereumNetwork).chainId,
				decimals: toNullable(decimals),
				symbol: toNullable(symbol),
				enabled: toNullable(enabled),
				version: toNullable(version)
			})
		)
	});

	progress(ProgressStepsAddToken.UPDATE_UI);

	// Hide tokens that have been disabled
	const disabledTokens = tokens.filter(({ enabled, id }) => !enabled && nonNullish(id));
	disabledTokens.forEach(({ id }) => erc20UserTokensStore.reset(id as symbol));

	// TODO(GIX-2740): reload only what's needed to spare Infura calls
	// Reload all user tokens for simplicity reason.
	await loadUserTokens({ identity });
};

export const saveTwinTokenInUserTokens = async ({
	identity,
	twinToken
}: {
	identity: OptionIdentity;
	twinToken: Erc20Token | undefined;
}) => {
	assertNonNullish(identity);

	assertNonNullish(twinToken, get(i18n).send.assertion.ckerc20_twin_token_missing);

	await saveUserTokens({
		progress: () => {},
		identity,
		tokens: [{ ...twinToken, enabled: true }]
	});
};
