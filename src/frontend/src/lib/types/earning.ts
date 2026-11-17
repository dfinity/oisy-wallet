import type { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
import type { Token, TokenId } from '$lib/types/token';

export interface EarningCardData {
	titles: string[];
	action: () => void;
}

// An earning opportunity whose rate is at or above the top-rate threshold: one Liquidium pool (all the
// networks it can be supplied from) or one Autopilot vault.
export interface EarningTopRate {
	id: string;
	providerId: string;
	// The token whose logo the opportunity shows.
	token: Token;
	symbol: string;
	networkIcons: string[];
	networkNames: string[];
	apy: number;
	// What the user's balance outside any earning position would earn in a year at this rate, in USD.
	earningPotentialUsd: number;
	// Whether the user already has a position in it: a Liquidium supply in the pool, or the vault's tokens.
	hasPosition: boolean;
	// The tokens it can be entered with: every network of a Liquidium pool, or an Autopilot vault's asset.
	tokenIds: TokenId[];
	// Opens the opportunity; `source` is where the user started it, for the analytics.
	action: (source: PLAUSIBLE_EVENT_SOURCE_LOCATIONS) => Promise<void>;
}
