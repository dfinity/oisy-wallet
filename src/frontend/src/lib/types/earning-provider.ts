import type { StakeProviderData } from '$lib/types/stake-provider';

export type EarningProviderData =
	| {
			stake: StakeProviderData;
	  }
	| {};
