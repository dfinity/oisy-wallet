import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { OptionBalance } from '$lib/types/balance';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable } from 'svelte/store';

export type SendData = Token;

export interface SendStore extends Readable<SendData> {
	set: (token: Token) => void;
}

const initSendStore = (token: Token): SendStore => {
	const { subscribe, set: setStore } = writable<SendData>(token);

	return {
		subscribe,

		set: (token: Token) => {
			setStore(token);
		}
	};
};

export const initSendContext = ({ token }: { token: Token }): SendContext => {
	const sendToken = initSendStore(token);

	const sendTokenDecimals = derived(sendToken, ({ decimals }) => decimals);
	const sendTokenId = derived(sendToken, ({ id }) => id);
	const sendTokenStandard = derived(sendToken, ({ standard }) => standard);
	const sendTokenSymbol = derived(sendToken, (token) => getTokenDisplaySymbol(token));
	const sendTokenNetworkId = derived(sendToken, ({ network: { id: networkId } }) => networkId);

	const sendBalance = derived(
		[balancesStore, sendTokenId],
		([$balanceStore, $sendTokenId]) => $balanceStore?.[$sendTokenId]?.data
	);

	const sendTokenExchangeRate = derived([exchanges, sendToken], ([$exchanges, $sendToken]) =>
		nonNullish($sendToken) ? $exchanges?.[$sendToken.id]?.usd : undefined
	);

	return {
		sendToken,
		sendTokenDecimals,
		sendTokenId,
		sendTokenStandard,
		sendTokenSymbol,
		sendBalance,
		sendTokenExchangeRate,
		sendTokenNetworkId
	};
};

export interface SendContext {
	sendToken: SendStore;
	sendTokenDecimals: Readable<number>;
	sendTokenId: Readable<TokenId>;
	sendTokenStandard: Readable<TokenStandard>;
	sendTokenSymbol: Readable<string>;
	sendBalance: Readable<OptionBalance>;
	sendTokenExchangeRate: Readable<number | undefined>;
	sendTokenNetworkId: Readable<NetworkId>;
}

export const SEND_CONTEXT_KEY = Symbol('send');
