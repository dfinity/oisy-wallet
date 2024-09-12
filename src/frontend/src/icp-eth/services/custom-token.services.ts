import type { CustomToken } from '$declarations/backend/backend.did';
import type { OptionErc20Token } from '$eth/types/erc20';
import type { SaveCustomToken } from '$icp/services/ic-custom-tokens.services';
import { loadCustomTokens } from '$icp/services/icrc.services';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { setCustomToken as setCustomTokenasApi } from '$lib/api/backend.api';
import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * When a user converts a ckERC20 token to an ERC20 twin token, the UI needs information about the counterpart token (ckERC20).
 * For example, the user might have an ERC20 token (e.g., USDC) enabled, but its token counterpart (e.g., ckUSDC) disabled.
 * As a result, the UI might lack necessary information.
 * Therefore, this function aims to enable the CK token if the user has only enabled the counterpart token.
 *
 * @param {Object} params - The parameters for the function.
 * @param {Erc20UserToken[]} params.icrcCustomTokens - The list of user's ICRC tokens.
 * @param {Token} params.sendToken - The token to be sent.
 * @param {OptionIdentity} params.identity - The user's identity.
 * @returns {Promise<{ result: 'loaded' | 'skipped' | 'error' }>} The result of the operation.
 */
export const autoLoadCustomToken = async ({
	icrcCustomTokens,
	sendToken,
	identity
}: {
	icrcCustomTokens: IcrcCustomToken[];
	sendToken: Token;
	identity: OptionIdentity;
}): Promise<{ result: 'loaded' | 'skipped' | 'error' }> => {
	if (sendToken.standard !== 'erc20') {
		return { result: 'skipped' };
	}

	const twinTokenSymbol = (sendToken as OptionErc20Token)?.twinTokenSymbol;

	if (isNullish(twinTokenSymbol)) {
		return { result: 'skipped' };
	}

	const icrcCustomToken = icrcCustomTokens.find(({ symbol }) => symbol === twinTokenSymbol);

	if (isNullish(icrcCustomToken)) {
		return { result: 'skipped' };
	}

	if (icrcCustomToken.standard !== 'icrc') {
		return { result: 'skipped' };
	}

	if (icrcCustomToken.enabled) {
		return { result: 'skipped' };
	}

	busy.start();

	try {
		assertNonNullish(identity);

		await setCustomToken({
			identity,
			token: icrcCustomToken,
			enabled: true
		});

		// TODO(GIX-2740): Only reload the tokens we need.
		await loadCustomTokens({ identity });
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).init.error.icrc_custom_tokens },
			err
		});

		return { result: 'error' };
	} finally {
		busy.stop();
	}

	return { result: 'loaded' };
};

export const toCustomToken = ({
	enabled,
	version,
	ledgerCanisterId,
	indexCanisterId
}: SaveCustomToken): CustomToken => ({
	enabled,
	version: toNullable(version),
	token: {
		Icrc: {
			ledger_id: Principal.fromText(ledgerCanisterId),
			index_id: toNullable(Principal.fromText(indexCanisterId))
		}
	}
});

export const setCustomToken = async ({
	token,
	identity,
	enabled
}: {
	identity: Identity;
	token: IcrcCustomToken;
	enabled: boolean;
}) =>
	await setCustomTokenasApi({
		identity,
		token: toCustomToken({ ...token, enabled })
	});
