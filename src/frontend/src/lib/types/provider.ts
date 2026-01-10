import type { EarningProviderData } from '$lib/types/earning-provider';

export interface Provider {
	name: string;
	logo: string;
	url: string;
	earning: EarningProviderData[];
}
