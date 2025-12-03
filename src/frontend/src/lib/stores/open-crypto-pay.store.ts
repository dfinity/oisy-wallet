import type { OpenCryptoPayResponse, PayableTokenWithFees } from '$lib/types/open-crypto-pay';
import { writable, type Readable } from 'svelte/store';

export interface PayContext {
	data: Readable<OpenCryptoPayResponse | undefined>;
	availableTokens: Readable<PayableTokenWithFees[]>;
	setData: (payData: OpenCryptoPayResponse) => void;
	setAvailableTokens: (tokens: PayableTokenWithFees[]) => void;
}

export const initPayContext = (): PayContext => {
	const data = writable<OpenCryptoPayResponse | undefined>(undefined);
	const tokensWithFees = writable<PayableTokenWithFees[]>([]);
	const { set: setData } = data;

	return {
		data,
		setData,
		availableTokens: tokensWithFees,
		setAvailableTokens: (tokens: PayableTokenWithFees[]) => {
			tokensWithFees.set(tokens);
		}
	};
};

export const PAY_CONTEXT_KEY = Symbol('open-crypto-pay');
