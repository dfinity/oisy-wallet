import type { OpenCryptoPayResponse } from '$lib/types/open-crypto-pay';
import { writable, type Readable } from 'svelte/store';

export interface PayContext {
	data: Readable<OpenCryptoPayResponse | undefined>;
	setData: (payData: OpenCryptoPayResponse) => void;
}

export const initPayContext = (): PayContext => {
	const data = writable<OpenCryptoPayResponse>(undefined);

	const { set: setData } = data;

	return {
		data,
		setData
	};
};

export const PAY_CONTEXT_KEY = Symbol('open-crypto-pay');
