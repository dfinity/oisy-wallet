import type { EarningCardFields } from '$env/types/env.earning-cards';
import type { Readable } from 'svelte/store';

export type EarningType = 'stake' | 'reward' | 'lending';

export interface EarningProviderCardConfig {
	id: string;
	titles: string[];
	description: string;
	logo: string;
	fields: EarningCardFields[];
	actionText: string;
}

export interface EarningProviderStaticConfig extends EarningProviderCardConfig {
	type: EarningType;
}

export type EarningProviderData = { [key in EarningCardFields]?: string | number | string[] } & {
	action: () => Promise<void>;
};

export interface EarningProvider {
	id: string;
	type: EarningType;
	card: EarningProviderCardConfig;
	data: Readable<EarningProviderData>;
}

export type EarningData = Record<string, EarningProviderData>;
