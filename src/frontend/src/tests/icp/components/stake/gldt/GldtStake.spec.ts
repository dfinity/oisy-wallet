import GldtStake from '$icp/components/stake/gldt/GldtStake.svelte';
import { GLDT_STAKE_CONTEXT_KEY, gldtStakeStore } from '$icp/stores/gldt-stake.store';
import { stakeProvidersConfig } from '$lib/config/stake.config';
import { StakeProvider } from '$lib/types/stake';
import { render } from '@testing-library/svelte';

describe('GldtStake', () => {
	let mockContext: Map<symbol, unknown>;

	beforeEach(() => {
		mockContext = new Map();

		mockContext.set(GLDT_STAKE_CONTEXT_KEY, {
			store: gldtStakeStore
		});
	});

	it('renders page title correctly', () => {
		const { container } = render(GldtStake, {
			context: mockContext
		});

		expect(container).toHaveTextContent(stakeProvidersConfig[StakeProvider.GLDT].name);
	});
});
