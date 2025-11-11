import GldtStake from '$icp/components/stake/gldt/GldtStake.svelte';
import { stakeProvidersConfig } from '$lib/config/stake.config';
import { StakeProvider } from '$lib/types/stake';
import { render } from '@testing-library/svelte';

describe('GldtStake', () => {
	it('renders page title correctly', () => {
		const { container } = render(GldtStake);

		expect(container).toHaveTextContent(stakeProvidersConfig[StakeProvider.GLDT].name);
	});
});
