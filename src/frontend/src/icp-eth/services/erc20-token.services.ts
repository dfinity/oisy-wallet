import type { UserToken } from '$declarations/backend/backend.did';
import { loadCustomTokens } from '$eth/services/erc20.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import type { SaveUserToken } from '$eth/types/erc20-user-token';
import type { IcCkToken } from '$icp/types/ic-token';
import { setCustomToken as setCustomTokenApi } from '$lib/api/backend.api';
import { autoLoadToken, type AutoLoadTokenResult } from '$lib/services/token.services';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { toNullable } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

const assertIcrcSendTokenData = (sendToken: IcCkToken): AutoLoadTokenResult | undefined => {
	if (sendToken.twinToken?.standard.code !== 'erc20') {
		return { result: 'skipped' };
	}
};

const findCustomToken = ({
	tokens,
	sendToken
}: {
	tokens: Erc20CustomToken[];
	sendToken: IcCkToken;
}): Erc20CustomToken | undefined =>
	tokens.find(
		({ address }) =>
			address.toLowerCase() === (sendToken.twinToken as Erc20Token).address.toLowerCase()
	);

/**
 * When a user converts an ERC20 token to a ckERC20 twin token, the UI needs information about the counterpart token (ERC20).
 * For example, the user might have a CK token (e.g., ckUSDC) enabled, but its token counterpart (e.g., USDC) disabled.
 * As a result, the UI might lack necessary information.
 * This is typically the case for the balance. For instance, when the user opens the modal to convert USDC to ckUSDC, Oisy informs them that they should first transfer USDC.
 * On that screen, the balance of USDC is displayed, so the user knows when the funds were transferred and when they can proceed with the conversion.
 * Therefore, this function aims to enable the counterpart token if the user has only enabled the CK token.
 *
 * @param {Object} params - The parameters for the function.
 * @param {Erc20CustomToken[]} params.erc20CustomTokens - The list of user's ERC20 tokens.
 * @param {Token} params.sendToken - The token to be sent.
 * @param {OptionIdentity} params.identity - The user's identity.
 * @returns {Promise<{ result: 'loaded' | 'skipped' | 'error' }>} The result of the operation.
 */
export const autoLoadErc20Token = async ({
	erc20CustomTokens,
	sendToken,
	identity
}: {
	erc20CustomTokens: Erc20CustomToken[];
	sendToken: Token;
	identity: OptionIdentity;
}): Promise<AutoLoadTokenResult> =>
	await autoLoadToken({
		tokens: erc20CustomTokens,
		sendToken: sendToken as IcCkToken,
		identity,
		expectedSendTokenStandard: { code: 'icrc' },
		assertSendTokenData: assertIcrcSendTokenData,
		findToken: findCustomToken,
		setToken: setCustomToken,
		loadTokens: loadCustomTokens,
		errorMessage: get(i18n).init.error.erc20_custom_token
	});

export const toUserToken = ({
	address: contract_address,
	network,
	decimals,
	symbol,
	version,
	enabled
}: SaveUserToken): UserToken => ({
	contract_address,
	chain_id: network.chainId,
	decimals: toNullable(decimals),
	symbol: toNullable(symbol),
	version: toNullable(version),
	enabled: toNullable(enabled)
});

export const setCustomToken = async ({
	token,
	identity,
	enabled
}: {
	identity: Identity;
	token: Erc20CustomToken;
	enabled: boolean;
}) =>
	await setCustomTokenApi({
		identity,
		token: toCustomToken({ ...token, enabled, chainId: token.network.chainId, networkKey: 'Erc20' })
	});
