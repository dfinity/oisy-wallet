import type {
	DailyAnalytics,
	Duration,
	StakePositionResponse
} from '$declarations/gldt_stake/gldt_stake.did';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

export const stakePositionMockResponse = {
	staked: 10000n,
	dissolve_delay: {
		secs: 10000000000n,
		nanos: 1000
	} as Duration,
	claimable_rewards: toNullable([{ ICP: null }, 100n]),
	created_at: 10000n,
	age_bonus_multiplier: 10,
	owned_by: mockPrincipal,
	dissolve_events: [
		{
			dissolved_date: 1764237501193n,
			completed: true,
			amount: 1000n,
			percentage: 1
		}
	],
	weighted_stake: 1000n,
	instant_dissolve_fee: 1000n
} as StakePositionResponse;

export const dailyAnalyticsMockResponse = {
	apy: 5,
	staked_gldt: 1000000n,
	rewards: toNullable([{ ICP: null }, 100n]),
	weighted_stake: 1000n
} as DailyAnalytics;
