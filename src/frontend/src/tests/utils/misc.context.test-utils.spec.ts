import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { HERO_CONTEXT_KEY } from '$lib/stores/hero.store';
import { MODAL_NETWORKS_LIST_CONTEXT_KEY } from '$lib/stores/modal-networks-list.store';
import { MODAL_TOKENS_LIST_CONTEXT_KEY } from '$lib/stores/modal-tokens-list.store';
import { PAY_CONTEXT_KEY } from '$lib/stores/open-crypto-pay.store';
import { REWARD_ELIGIBILITY_CONTEXT_KEY } from '$lib/stores/reward.store';
import { mockTokens } from '$tests/mocks/tokens.mock';
import {
	mockHeroContextEntry,
	mockModalNetworksListContextEntry,
	mockModalTokensListContextEntry,
	mockPayContextEntry,
	mockRewardEligibilityContextEntry
} from '$tests/utils/misc.context.test-utils';
import { get, type Readable } from 'svelte/store';

describe('misc.context.test-utils', () => {
	describe('mockPayContextEntry', () => {
		it('returns an entry keyed by the pay context symbol', () => {
			const [key, value] = mockPayContextEntry();

			expect(key).toBe(PAY_CONTEXT_KEY);
			expect(get((value as { data: Readable<unknown> }).data)).toBeUndefined();
		});
	});

	describe('mockHeroContextEntry', () => {
		it('returns an entry keyed by the hero context symbol', () => {
			const [key, value] = mockHeroContextEntry();

			expect(key).toBe(HERO_CONTEXT_KEY);
			expect(get((value as { loading: Readable<unknown> }).loading)).toBeTruthy();
		});
	});

	describe('mockRewardEligibilityContextEntry', () => {
		it('returns an entry keyed by the reward eligibility context symbol', () => {
			const [key, value] = mockRewardEligibilityContextEntry();

			expect(key).toBe(REWARD_ELIGIBILITY_CONTEXT_KEY);
			expect((value as { getCampaignEligibility: unknown }).getCampaignEligibility).toBeInstanceOf(
				Function
			);
		});
	});

	describe('mockModalTokensListContextEntry', () => {
		it('returns an entry keyed by the modal tokens list context symbol', () => {
			const [key, value] = mockModalTokensListContextEntry({ tokens: mockTokens });

			expect(key).toBe(MODAL_TOKENS_LIST_CONTEXT_KEY);
			expect(get((value as { filteredTokens: Readable<unknown> }).filteredTokens)).toHaveLength(
				mockTokens.length
			);
		});
	});

	describe('mockModalNetworksListContextEntry', () => {
		it('returns an entry keyed by the modal networks list context symbol', () => {
			const [key, value] = mockModalNetworksListContextEntry({ networks: [ICP_NETWORK] });

			expect(key).toBe(MODAL_NETWORKS_LIST_CONTEXT_KEY);
			expect(
				get((value as { filteredNetworks: Readable<unknown> }).filteredNetworks)
			).toStrictEqual([ICP_NETWORK]);
		});
	});
});
