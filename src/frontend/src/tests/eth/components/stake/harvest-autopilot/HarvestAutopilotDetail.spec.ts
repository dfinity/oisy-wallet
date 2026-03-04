import HarvestAutopilotDetail from '$eth/components/stake/harvest-autopilot/HarvestAutopilotDetail.svelte';
import * as harvestAutopilotsDerived from '$eth/derived/harvest-autopilots.derived';
import * as addressDerived from '$lib/derived/address.derived';
import * as navDerived from '$lib/derived/nav.derived';
import * as tokensUiDerived from '$lib/derived/tokens-ui.derived';
import type { Vault } from '$lib/types/vaults';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$env/earning', () => ({
	get EARNING_ENABLED() {
		return true;
	}
}));

describe('HarvestAutopilotDetail', () => {
	const mockVault: Vault = {
		token: {
			...mockValidErc4626Token,
			enabled: true,
			version: 1n,
			usdBalance: 500,
			balance: 50000000000n
		},
		apy: '5.5',
		totalValueLocked: '184665.22'
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(harvestAutopilotsDerived, 'harvestAutopilots', 'get').mockReturnValue(
			readable([mockVault])
		);

		vi.spyOn(navDerived, 'routeAutopilotVault', 'get').mockReturnValue(
			readable(mockVault.token.address)
		);

		vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable(mockEthAddress));

		vi.spyOn(tokensUiDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			readable(1000)
		);
	});

	it('should render the page title with vault token name', () => {
		const { getByText } = render(HarvestAutopilotDetail);

		expect(getByText(mockVault.token.name)).toBeInTheDocument();
	});

	it('should render the page description', () => {
		const { container } = render(HarvestAutopilotDetail);

		expect(container.textContent).toContain('Autopilot is powered by');
	});

	it('should render the max APY', () => {
		const { getByText } = render(HarvestAutopilotDetail);

		expect(getByText('5.50%')).toBeInTheDocument();
	});

	it('should render the earning potential card', () => {
		const { getByText } = render(HarvestAutopilotDetail);

		expect(getByText(en.stake.text.earning_potential)).toBeInTheDocument();
	});

	it('should render the active earning card', () => {
		const { getByText } = render(HarvestAutopilotDetail);

		expect(getByText(en.stake.text.active_earning)).toBeInTheDocument();
	});

	it('should render the vault info section', () => {
		const { getByText } = render(HarvestAutopilotDetail);

		expect(getByText(en.stake.text.vault_info)).toBeInTheDocument();
	});

	it('should not render vault info when vault is not found', () => {
		vi.spyOn(navDerived, 'routeAutopilotVault', 'get').mockReturnValue(
			readable('0xNonExistentAddress')
		);

		const { queryByText } = render(HarvestAutopilotDetail);

		expect(queryByText(en.stake.text.vault_info)).not.toBeInTheDocument();
	});

	it('should not render the transactions section when there are no transactions', () => {
		const { queryByText } = render(HarvestAutopilotDetail);

		expect(queryByText(en.navigation.text.activity)).not.toBeInTheDocument();
	});

	it('should render the back button', () => {
		const { getByRole } = render(HarvestAutopilotDetail);

		expect(getByRole('button', { name: 'icon' })).toBeInTheDocument();
	});
});
