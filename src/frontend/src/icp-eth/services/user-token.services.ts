import { loadUserTokens } from '$eth/services/erc20.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import type { OptionIcCkToken } from '$icp/types/ic';
import { setUserToken as setUserTokenApi } from '$lib/api/backend.api';
import { busy } from '$lib/stores/busy.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { Identity } from '@dfinity/agent';
import { assertNonNullish, isNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * When a user converts an ERC20 token to a ckERC20 twin token, the UI needs information about the counterpart token (ERC20).
 * For example, the user might have a CK token (e.g., ckUSDC) enabled, but its token counterpart (e.g., USDC) disabled.
 * As a result, the UI might lack necessary information.
 * This is typically the case for the balance. For instance, when the user opens the modal to convert USDC to ckUSDC, Oisy informs them that they should first transfer USDC.
 * On that screen, the balance of USDC is displayed, so the user knows when the funds were transferred and when they can proceed with the conversion.
 * Therefore, this function aims to enable the counterpart token if the user has only enabled the CK token.
 *
 * @param {Object} params - The parameters for the function.
 * @param {Erc20UserToken[]} params.erc20UserTokens - The list of user's ERC20 tokens.
 * @param {Token} params.sendToken - The token to be sent.
 * @param {OptionIdentity} params.identity - The user's identity.
 * @returns {Promise<{ result: 'loaded' | 'skipped' | 'error' }>} The result of the operation.
 */
export const autoLoadUserToken = async ({
	erc20UserTokens,
	sendToken,
	identity
}: {
	erc20UserTokens: Erc20UserToken[];
	sendToken: Token;
	identity: OptionIdentity;
}): Promise<{ result: 'loaded' | 'skipped' | 'error' }> => {
	if (sendToken.standard !== 'icrc') {
		return { result: 'skipped' };
	}

	const twinToken = (sendToken as OptionIcCkToken)?.twinToken;
	if (isNullish(twinToken)) {
		return { result: 'skipped' };
	}

	const erc20UserToken = erc20UserTokens.find(
		({ address }) => address.toLowerCase() === (twinToken as Erc20Token).address.toLowerCase()
	);

	if (erc20UserToken?.enabled === true) {
		return { result: 'skipped' };
	}

	busy.start();

	try {
		assertNonNullish(identity);

		await setUserToken({
			identity,
			token: erc20UserToken ?? {
				...(twinToken as Erc20Token),
				enabled: false,
				version: undefined
			},
			enabled: true
		});

		// TODO: For simplicity, we reload all the user's tokens. However, for performance reasons, here and in other areas of the codebase, we might only reload the tokens we need.
		await loadUserTokens({ identity });
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).init.error.erc20_user_token },
			err
		});

		return { result: 'error' };
	} finally {
		busy.stop();
	}

	return { result: 'loaded' };
};

export const setUserToken = async ({
	token,
	identity,
	enabled
}: {
	identity: Identity;
	token: Erc20UserToken;
	enabled: boolean;
}) => {
	const { version, symbol, network, address, decimals } = token;
	const { chainId } = network as EthereumNetwork;

	await setUserTokenApi({
		identity,
		token: {
			chain_id: chainId,
			decimals: toNullable(decimals),
			contract_address: address,
			symbol: toNullable(symbol),
			version: toNullable(version),
			enabled: toNullable(enabled)
		}
	});
};
