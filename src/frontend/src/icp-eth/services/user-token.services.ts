import type { UserToken } from '$declarations/backend/backend.did';
import type { SaveUserToken } from '$eth/services/erc20-user-tokens.services';
import { loadErc20UserTokens } from '$eth/services/erc20.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { IcCkToken } from '$icp/types/ic-token';
import { setUserToken as setUserTokenApi } from '$lib/api/backend.api';
import { autoLoadToken, type AutoLoadTokenResult } from '$lib/services/token.services';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { Identity } from '@dfinity/agent';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

const assertIcrcSendTokenData = (sendToken: IcCkToken): AutoLoadTokenResult | undefined => {
	if (sendToken.twinToken?.standard !== 'erc20') {
		return { result: 'skipped' };
	}
};

const findUserToken = ({
	tokens,
	sendToken
}: {
	tokens: Erc20UserToken[];
	sendToken: IcCkToken;
}): Erc20UserToken | undefined =>
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
}): Promise<AutoLoadTokenResult> =>
	await autoLoadToken({
		tokens: erc20UserTokens,
		sendToken: sendToken as IcCkToken,
		identity,
		expectedSendTokenStandard: 'icrc',
		assertSendTokenData: assertIcrcSendTokenData,
		findToken: findUserToken,
		setToken: setUserToken,
		loadTokens: loadErc20UserTokens,
		errorMessage: get(i18n).init.error.erc20_user_token
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

export const setUserToken = async ({
	token,
	identity,
	enabled
}: {
	identity: Identity;
	token: Erc20UserToken;
	enabled: boolean;
}) =>
	await setUserTokenApi({
		identity,
		token: toUserToken({
			...token,
			enabled
		}),
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});
