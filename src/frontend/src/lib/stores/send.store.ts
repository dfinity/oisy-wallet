import { isTokenIc } from '$icp/utils/icrc.utils';
import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Address } from '$lib/types/address';
import type { OptionBalance } from '$lib/types/balance';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { nonNullish, notEmptyString } from '@dfinity/utils';
import { encodeIcrcAccount } from '@icp-sdk/canisters/ledger/icrc';
import { derived, writable, type Readable, type Writable } from 'svelte/store';

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

export const initSendContext = ({
	token,
	customSendBalance
}: {
	token: Token;
	customSendBalance?: OptionBalance;
}): SendContext => {
	const sendToken = initSendStore(token);

	const sendTokenDecimals = derived(sendToken, ({ decimals }) => decimals);
	const sendTokenId = derived(sendToken, ({ id }) => id);
	const sendTokenStandard = derived(sendToken, ({ standard }) => standard);
	const sendTokenSymbol = derived(sendToken, (token) => getTokenDisplaySymbol(token));
	const sendTokenNetworkId = derived(sendToken, ({ network: { id: networkId } }) => networkId);

	const sendTokenExchangeRate = derived([exchanges, sendToken], ([$exchanges, $sendToken]) =>
		nonNullish($sendToken) ? $exchanges?.[$sendToken.id]?.usd : undefined
	);

	const sendBalance = derived(
		[balancesStore, sendTokenId],
		([$balanceStore, $sendTokenId]) => customSendBalance ?? $balanceStore?.[$sendTokenId]?.data
	);

	const sendDestination = writable<Address>('');

	const isIcBurning = derived(
		[sendToken, sendDestination],
		([$sendToken, $sendDestination]) =>
			notEmptyString($sendDestination) &&
			nonNullish($sendToken) &&
			isTokenIc($sendToken) &&
			nonNullish($sendToken.mintingAccount) &&
			$sendDestination === encodeIcrcAccount($sendToken.mintingAccount)
	);

	return {
		sendToken,
		sendTokenDecimals,
		sendTokenId,
		sendTokenStandard,
		sendTokenSymbol,
		sendTokenExchangeRate,
		sendTokenNetworkId,
		sendBalance,
		sendDestination,
		isIcBurning
	};
};

export interface SendContext {
	sendToken: SendStore;
	sendTokenDecimals: Readable<number>;
	sendTokenId: Readable<TokenId>;
	sendTokenStandard: Readable<TokenStandard>;
	sendTokenSymbol: Readable<string>;
	sendTokenExchangeRate: Readable<number | undefined>;
	sendTokenNetworkId: Readable<NetworkId>;
	sendBalance: Readable<OptionBalance>;
	sendDestination: Writable<Address>;
	isIcBurning: Readable<boolean>;
}

export const SEND_CONTEXT_KEY = Symbol('send');
