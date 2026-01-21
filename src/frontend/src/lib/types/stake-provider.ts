import type { StakePosition, StakeProvider } from '$lib/types/stake';

export interface StakeProviderData {
	provider: StakeProvider;
	terms: string;
	positions: StakePosition[];
}
