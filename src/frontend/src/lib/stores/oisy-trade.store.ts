import type { OisyTradeStoreData } from '$lib/types/oisy-trade';
import type { Principal } from '@icp-sdk/core/principal';
import { writable, type Readable } from 'svelte/store';

export interface OisyTradeStore extends Readable<OisyTradeStoreData> {
	init: (principal: Principal) => void;
	set: (data: OisyTradeStoreData) => void;
	setForPrincipal: (params: { principal: Principal; data: OisyTradeStoreData }) => void;
	reset: () => void;
}

const initOisyTradeStore = (): OisyTradeStore => {
	const defaultStoreValue: OisyTradeStoreData = {
		pairs: undefined,
		supportedTokens: undefined,
		balances: undefined
	};
	const { subscribe, set } = writable<OisyTradeStoreData>(defaultStoreValue);
	let currentPrincipalText: string | undefined;

	return {
		subscribe,
		init: (principal) => {
			const principalText = principal.toText();

			if (currentPrincipalText === principalText) {
				return;
			}

			currentPrincipalText = principalText;
			set(defaultStoreValue);
		},
		set,
		setForPrincipal: ({ principal, data }) => {
			if (currentPrincipalText !== principal.toText()) {
				return;
			}

			set(data);
		},
		reset: () => {
			currentPrincipalText = undefined;
			set(defaultStoreValue);
		}
	};
};

export const oisyTradeStore = initOisyTradeStore();
