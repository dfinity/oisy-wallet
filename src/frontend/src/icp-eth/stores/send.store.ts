import { ETHEREUM_TOKEN } from '$icp-eth/constants/tokens.constants';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import type { BigNumber } from '@ethersproject/bignumber';
import { derived, writable, type Readable } from 'svelte/store';

export type SendData = Token;

export interface SendStore extends Readable<SendData> {
	set: (token: Token) => void;
}

// TODO: sepolia?

const initSendStore = (): SendStore => {
	const { subscribe, set: setStore } = writable<SendData>(ETHEREUM_TOKEN);

	return {
		subscribe,

		set(token: Token) {
			setStore(token);
		}
	};
};

export const initSendContext = (staticContext: Pick<SendContext, 'sendPurpose'>): SendContext => {
	const sendToken = initSendStore();

	const sendTokenDecimals = derived(sendToken, ({ decimals }) => decimals);
	const sendTokenId = derived(sendToken, ({ id }) => id);
	const sendTokenStandard = derived(sendToken, ({ standard }) => standard);

	const sendBalance = derived(
		[balancesStore, sendTokenId],
		([$balanceStore, $sendTokenId]) => $balanceStore?.[$sendTokenId]?.data
	);

	return {
		sendToken,
		sendTokenDecimals,
		sendTokenId,
		sendTokenStandard,
		sendBalance,
		...staticContext
	};
};

export type SendContextPurpose = 'send' | 'convert-eth-to-cketh';

export interface SendContext {
	sendToken: SendStore;
	sendTokenDecimals: Readable<number>;
	sendTokenId: Readable<TokenId>;
	sendTokenStandard: Readable<TokenStandard>;
	sendBalance: Readable<BigNumber | undefined | null>;
	sendPurpose: SendContextPurpose;
}

export const SEND_CONTEXT_KEY = Symbol('send');
