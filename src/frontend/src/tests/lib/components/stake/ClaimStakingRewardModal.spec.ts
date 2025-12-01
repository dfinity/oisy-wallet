import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import ClaimStakingRewardModal from '$lib/components/stake/ClaimStakingRewardModal.svelte';
import { StakeProvider } from '$lib/types/stake';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('ClaimStakingRewardModal', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should display correct modal title', () => {
		const { container } = render(ClaimStakingRewardModal, {
			props: {
				provider: StakeProvider.GLDT,
				token: ICP_TOKEN,
				rewardAmount: 100
			},
			context: new Map<symbol, GldtStakeContext>([
				[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
			])
		});

		expect(container).toHaveTextContent(en.stake.text.claim_reward);
	});
});
