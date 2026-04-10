import HarvestAutopilot from '$eth/components/stake/harvest-autopilot/HarvestAutopilot.svelte';
import * as harvestAutopilotsDerived from '$eth/derived/harvest-autopilots.derived';
import * as navDerived from '$lib/derived/nav.derived';
import type { Vault } from '$lib/types/vaults';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$env/earning', () => ({
	get EARNING_ENABLED() {
		return true;
	}
}));

describe('HarvestAutopilot', () => {
	const mockVault: Vault = {
		token: {
			...mockValidErc4626Token,
			enabled: true,
			version: 1n,
			usdBalance: 500,
			balance: 50000000000n
		},
		apy: '5.5'
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(harvestAutopilotsDerived, 'harvestAutopilots', 'get').mockReturnValue(
			readable([mockVault])
		);
	});

	it('should render overview when no vault is selected', () => {
		vi.spyOn(navDerived, 'routeAutopilotVault', 'get').mockReturnValue(readable(undefined));

		const { getByText } = render(HarvestAutopilot);

		expect(getByText(en.earning.cards.harvest_autopilot.title)).toBeInTheDocument();
	});

	it('should render detail when a vault is selected', () => {
		vi.spyOn(navDerived, 'routeAutopilotVault', 'get').mockReturnValue(
			readable(mockVault.token.address)
		);

		const { getByText } = render(HarvestAutopilot);

		expect(getByText(en.stake.text.vault_info)).toBeInTheDocument();
	});
});
