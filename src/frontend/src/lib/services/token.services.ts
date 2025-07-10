import type { SaveUserToken } from '$eth/services/erc20-user-tokens.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcCkToken } from '$icp/types/ic-token';
import { busy } from '$lib/stores/busy.store';
import { toastsError } from '$lib/stores/toasts.store';
import { token as tokenStore } from '$lib/stores/token.store';
import type { SaveCustomToken } from '$lib/types/custom-token';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token, TokenStandard } from '$lib/types/token';
import type { Identity } from '@dfinity/agent';
import { assertNonNullish, isNullish } from '@dfinity/utils';

export const loadTokenAndRun = async ({
	token,
	callback
}: {
	token: Token;
	callback: () => Promise<void>;
}) => {
	tokenStore.set(token);
	await callback();
};

export interface AutoLoadSingleTokenParams<T extends SaveUserToken | SaveCustomToken> {
	token: T | undefined;
	identity: OptionIdentity;
	setToken: (params: { identity: Identity; token: T; enabled: boolean }) => Promise<void>;
	loadTokens: (params: { identity: OptionIdentity }) => Promise<void>;
	errorMessage: string;
}

export type AutoLoadTokenParams<
	T extends SaveUserToken | SaveCustomToken,
	K extends Erc20Token | IcCkToken
> = Omit<AutoLoadSingleTokenParams<T>, 'token'> & {
	tokens: T[];
	sendToken: K;
	expectedSendTokenStandard: TokenStandard;
	assertSendTokenData: (sendToken: K) => AutoLoadTokenResult | undefined;
	findToken: (params: { tokens: T[]; sendToken: K }) => T | undefined;
};

export interface AutoLoadTokenResult {
	result: 'loaded' | 'skipped' | 'error';
}

/**
 * A generic function to handle loading a specific token.
 *
 * @param {Object} params - The parameters for the function.
 * @param {Token} params.token - The token to be loaded.
 * @param {OptionIdentity} params.identity - The user's identity.
 * @param {function} params.setToken - A function to enable the counterpart token.
 * @param {function} params.loadTokens - A function to reload tokens.
 * @param {string} params.errorMessage - A message to display in case of an error.
 * @returns The result of the operation.
 */
export const autoLoadSingleToken = async <T extends SaveUserToken | SaveCustomToken>({
	token,
	identity,
	setToken,
	loadTokens,
	errorMessage
}: AutoLoadSingleTokenParams<T>): Promise<AutoLoadTokenResult> => {
	if (isNullish(token)) {
		return { result: 'skipped' };
	}

	if (token.enabled) {
		return { result: 'skipped' };
	}

	busy.start();

	try {
		assertNonNullish(identity);

		await setToken({
			identity,
			token,
			enabled: true
		});

		// TODO(GIX-2740): Only reload the tokens we need.
		await loadTokens({ identity });
	} catch (err: unknown) {
		toastsError({
			msg: { text: errorMessage },
			err
		});

		return { result: 'error' };
	} finally {
		busy.stop();
	}

	return { result: 'loaded' };
};

/**
 * A generic function to handle loading a token that is either:
 * - the ERC20 twin token if `sendToken` is an ICRC token;
 * - the ICRC ck-token if `sendToken` is an ERC20 token.
 *
 * @param {Object} params - The parameters for the function.
 * @param {Token[]} params.tokens - The list of user's tokens (could be ERC20 or ICRC).
 * @param {Token} params.sendToken - The token to be sent.
 * @param {OptionIdentity} params.identity - The user's identity.
 * @param {string} params.expectedSendTokenStandard - The expected standard of the `sendToken` (e.g., 'erc20', 'icrc').
 * @param {function} params.assertSendTokenData - A function to assert the data of the `sendToken`.
 * @param {function} params.findToken - A function that finds the counterpart token from the user tokens list.
 * @param {function} params.setToken - A function to enable the counterpart token.
 * @param {function} params.loadTokens - A function to reload tokens.
 * @param {string} params.errorMessage - A message to display in case of an error.
 * @returns The result of the operation.
 */
export const autoLoadToken = async <
	T extends SaveUserToken | SaveCustomToken,
	K extends Erc20Token | IcCkToken
>({
	tokens,
	sendToken,
	identity,
	expectedSendTokenStandard,
	assertSendTokenData,
	findToken,
	setToken,
	loadTokens,
	errorMessage
}: AutoLoadTokenParams<T, K>): Promise<AutoLoadTokenResult> => {
	if (sendToken.standard !== expectedSendTokenStandard) {
		return { result: 'skipped' };
	}

	const { result: resultAssertData } = assertSendTokenData(sendToken) ?? {};

	if (resultAssertData === 'skipped') {
		return { result: resultAssertData };
	}

	const counterpartToken = findToken({ tokens, sendToken });

	return await autoLoadSingleToken({
		token: counterpartToken,
		identity,
		setToken,
		loadTokens,
		errorMessage
	});
};
