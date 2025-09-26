import type { Erc20Token } from '$eth/types/erc20';
import { loadCustomTokens } from '$icp/services/icrc.services';
import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { setCustomToken as setCustomTokenApi } from '$lib/api/backend.api';
import { autoLoadToken, type AutoLoadTokenResult } from '$lib/services/token.services';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { isNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

const assertErc20SendTokenData = (sendToken: Erc20Token): AutoLoadTokenResult | undefined => {
	if (isNullish(sendToken.twinTokenSymbol)) {
		return { result: 'skipped' };
	}
};

const findCustomToken = ({
	tokens,
	sendToken
}: {
	tokens: IcrcCustomToken[];
	sendToken: Erc20Token;
}): IcrcCustomToken | undefined =>
	tokens.find(({ symbol }) => symbol === sendToken.twinTokenSymbol);

/**
 * When a user converts a ckERC20 token to an ERC20 twin token, the UI needs information about the counterpart token (ckERC20).
 * For example, the user might have an ERC20 token (e.g., USDC) enabled, but its token counterpart (e.g., ckUSDC) disabled.
 * As a result, the UI might lack necessary information.
 * Therefore, this function aims to enable the CK token if the user has only enabled the counterpart token.
 *
 * @param {Object} params - The parameters for the function.
 * @param {IcrcCustomToken[]} params.icrcCustomTokens - The list of user's ICRC tokens.
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
}): Promise<AutoLoadTokenResult> =>
	await autoLoadToken({
		tokens: icrcCustomTokens,
		sendToken: sendToken as Erc20Token,
		identity,
		expectedSendTokenStandard: 'erc20',
		assertSendTokenData: assertErc20SendTokenData,
		findToken: findCustomToken,
		setToken: setCustomToken,
		loadTokens: loadCustomTokens,
		errorMessage: get(i18n).init.error.icrc_custom_token
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
	await setCustomTokenApi({
		identity,
		token: toCustomToken({ ...token, enabled, networkKey: 'Icrc' })
	});
