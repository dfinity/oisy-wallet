import type { Duration, Result_3 } from '$declarations/gldt_stake/gldt_stake.did';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';

export const stakePositionMockResponse = {
	Ok: {
		staked: 10000n,
		dissolve_delay: {
			secs: 100n,
			nanos: 1000
		} as Duration,
		claimable_rewards: toNullable([{ ICP: null }, 100n]),
		created_at: 10000n,
		age_bonus_multiplier: 10,
		owned_by: mockPrincipal,
		dissolve_events: [
			{
				dissolved_date: 1000n,
				completed: true,
				amount: 1000n,
				percentage: 1000
			}
		],
		weighted_stake: 1000n,
		instant_dissolve_fee: 1000n
	}
} as Result_3;
