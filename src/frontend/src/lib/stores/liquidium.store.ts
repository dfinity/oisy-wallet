import type { LiquidiumStoreData } from '$lib/types/liquidium';
import type { Principal } from '@icp-sdk/core/principal';
import { writable, type Readable } from 'svelte/store';

export interface LiquidiumStore extends Readable<LiquidiumStoreData> {
	init: (principal: Principal) => void;
	set: (data: LiquidiumStoreData) => void;
	setForPrincipal: (params: { principal: Principal; data: LiquidiumStoreData }) => void;
	reset: () => void;
}

const initLiquidiumStore = (): LiquidiumStore => {
	const defaultStoreValue: LiquidiumStoreData = { markets: [], portfolio: null };
	const { subscribe, set } = writable<LiquidiumStoreData>(defaultStoreValue);
	let currentPrincipal: string | undefined;

	return {
		subscribe,
		init: (principal) => {
			const principalText = principal.toText();

			if (currentPrincipal === principalText) {
				return;
			}

			currentPrincipal = principalText;
			set(defaultStoreValue);
		},
		set,
		setForPrincipal: ({ principal, data }) => {
			if (currentPrincipal !== principal.toText()) {
				return;
			}

			set(data);
		},
		reset: () => {
			currentPrincipal = undefined;
			set(defaultStoreValue);
		}
	};
};

export const liquidiumStore = initLiquidiumStore();
