import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import type { IcToken } from '$icp/types/ic';
import { balancesStore } from '$lib/stores/balances.store';
import type { OptionBalance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable, writable } from 'svelte/store';

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

	const sendTokenAsIcToken: Readable<IcToken> = derived(sendToken, (token) => token as IcToken);

	const ethereumNativeToken: Readable<Token | undefined> = derived(
		[sendToken, enabledEthereumTokens],
		([$sendToken, $enabledEthereumTokens]) =>
			$enabledEthereumTokens.find(({ network: { id: networkId } }) => $sendToken.id === networkId)
	);

	const ethereumNativeTokenBalance: Readable<OptionBalance> = derived(
		[balancesStore, ethereumNativeToken],
		([$balanceStore, $ethereumNativeToken]) =>
			nonNullish($ethereumNativeToken) ? $balanceStore?.[$ethereumNativeToken.id]?.data : undefined
	);

	const sendBalance = derived(
		[balancesStore, sendToken],
		([$balanceStore, $sendToken]) => $balanceStore?.[$sendToken.id]?.data
	);

	return {
		sendToken,
		sendTokenAsIcToken,
		ethereumNativeToken,
		ethereumNativeTokenBalance,
		sendBalance,
		...staticContext
	};
};

export type SendContextPurpose = 'send' | 'convert-eth-to-cketh' | 'convert-erc20-to-ckerc20';

export interface SendContext {
	sendToken: SendStore;
	sendTokenAsIcToken: Readable<IcToken>;
	ethereumNativeToken: Readable<Token | undefined>;
	ethereumNativeTokenBalance: Readable<OptionBalance>;
	sendBalance: Readable<OptionBalance>;
	sendPurpose: SendContextPurpose;
}

export const SEND_CONTEXT_KEY = Symbol('send');
