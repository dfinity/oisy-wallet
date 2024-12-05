import type { IcToken } from '$icp/types/ic';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { balancesStore } from '$lib/stores/balances.store';
import type { OptionBalance } from '$lib/types/balance';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import { derived, writable, type Readable } from 'svelte/store';

export type SendData = Token;

export interface SendStore extends Readable<SendData> {
	set: (token: Token) => void;
}

const initSendStore = (token: Token): SendStore => {
	const { subscribe, set: setStore } = writable<SendData>(token);

	return {
		subscribe,

		set(token: Token) {
			setStore(token);
		}
	};
};

export const initSendContext = ({
	token,
	...staticContext
}: Pick<SendContext, 'sendPurpose'> & { token: Token }): SendContext => {
	const sendToken = initSendStore(token);

	const sendTokenDecimals = derived(sendToken, ({ decimals }) => decimals);
	const sendTokenId = derived(sendToken, ({ id }) => id);
	const sendTokenStandard = derived(sendToken, ({ standard }) => standard);
	const sendTokenSymbol = derived(sendToken, ({ symbol }) => symbol);

	const sendBalance = derived(
		[balancesStore, sendTokenId],
		([$balanceStore, $sendTokenId]) => $balanceStore?.[$sendTokenId]?.data
	);

	const sendTokenAsIcToken = derived(sendToken, ($sendToken) => $sendToken as IcToken);
	const sendTokenWithFallbackAsIcToken = derived(
		sendToken,
		($sendToken) => ($sendToken ?? DEFAULT_ETHEREUM_TOKEN) as IcToken
	);

	return {
		sendToken,
		sendTokenDecimals,
		sendTokenId,
		sendTokenStandard,
		sendTokenSymbol,
		sendBalance,
		sendTokenAsIcToken,
		sendTokenWithFallbackAsIcToken,
		...staticContext
	};
};

export type SendContextPurpose =
	| 'send'
	| 'convert-eth-to-cketh'
	| 'convert-cketh-to-eth'
	| 'convert-erc20-to-ckerc20';

export interface SendContext {
	sendToken: SendStore;
	sendTokenDecimals: Readable<number>;
	sendTokenId: Readable<TokenId>;
	sendTokenStandard: Readable<TokenStandard>;
	sendTokenSymbol: Readable<string>;
	sendBalance: Readable<OptionBalance>;
	sendTokenAsIcToken: Readable<IcToken>;
	sendTokenWithFallbackAsIcToken: Readable<IcToken>;
	sendPurpose: SendContextPurpose;
}

export const SEND_CONTEXT_KEY = Symbol('send');
