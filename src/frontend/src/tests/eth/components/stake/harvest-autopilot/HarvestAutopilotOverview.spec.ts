import { EarningCardFields } from '$env/types/env.earning-cards';
import HarvestAutopilotOverview from '$eth/components/stake/harvest-autopilot/HarvestAutopilotOverview.svelte';
import * as harvestAutopilotsDerived from '$eth/derived/harvest-autopilots.derived';
import { ZERO } from '$lib/constants/app.constants';
import * as earningDerived from '$lib/derived/earning.derived';
import * as tokensUiDerived from '$lib/derived/tokens-ui.derived';
import type { Vault } from '$lib/types/vaults';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$env/earning', () => ({
	get EARNING_ENABLED() {
		return true;
	}
}));

describe('HarvestAutopilotOverview', () => {
	const mockVaultWithBalance: Vault = {
		token: {
			...mockValidErc4626Token,
			id: parseTokenId('VaultWithBalance'),
			name: 'VaultWithBalance',
			enabled: true,
			usdBalance: 500,
			version: 1n,
			balance: ZERO
		},
		apy: '5.5'
	};

	const mockVaultWithoutBalance: Vault = {
		token: {
			...mockValidErc4626Token,
			id: parseTokenId('VaultWithoutBalance'),
			name: 'VaultWithoutBalance',
			enabled: true,
			version: 1n,
			usdBalance: 0,
			balance: ZERO
		},
		apy: '3.2'
	};

	const mockEarningData = {
		'harvest-autopilot': {
			[EarningCardFields.APY]: '5.5',
			[EarningCardFields.CURRENT_EARNING]: 27.5,
			[EarningCardFields.CURRENT_STAKED]: 500,
			[EarningCardFields.EARNING_POTENTIAL]: 50,
			[EarningCardFields.NETWORKS]: [],
			[EarningCardFields.ASSETS]: [],
			action: vi.fn()
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(harvestAutopilotsDerived, 'harvestAutopilots', 'get').mockReturnValue(
			readable([mockVaultWithBalance, mockVaultWithoutBalance])
		);

		vi.spyOn(earningDerived, 'earningData', 'get').mockReturnValue(readable(mockEarningData));

		vi.spyOn(tokensUiDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			readable(1000)
		);
	});

	it('should render the page title', () => {
		const { getByText } = render(HarvestAutopilotOverview);

		expect(getByText(en.earning.cards.harvest_autopilot.title)).toBeInTheDocument();
	});

	it('should render the page description', () => {
		const { getByText } = render(HarvestAutopilotOverview);

		expect(getByText(en.stake.text.harvest_autopilot_page_description)).toBeInTheDocument();
	});

	it('should render the max APY', () => {
		const { getByText } = render(HarvestAutopilotOverview);

		expect(getByText('5.50%')).toBeInTheDocument();
	});

	it('should render the learn more button', () => {
		const { getByText } = render(HarvestAutopilotOverview);

		expect(getByText(en.core.text.learn_more)).toBeInTheDocument();
	});

	it('should render the earning potential card', () => {
		const { getByText } = render(HarvestAutopilotOverview);

		expect(getByText(en.stake.text.earning_potential)).toBeInTheDocument();
	});

	it('should render the active earning card', () => {
		const { getByText } = render(HarvestAutopilotOverview);

		expect(getByText(en.stake.text.active_earning)).toBeInTheDocument();
	});

	it('should render the my positions section for vaults with balance', () => {
		const { getByText } = render(HarvestAutopilotOverview);

		expect(getByText(en.stake.text.my_positions)).toBeInTheDocument();
		expect(getByText(mockVaultWithBalance.token.name)).toBeInTheDocument();
	});

	it('should render the available autopilots section for vaults without balance', () => {
		const { getByText } = render(HarvestAutopilotOverview);

		expect(getByText(en.stake.text.available_autopilots)).toBeInTheDocument();
		expect(getByText(mockVaultWithoutBalance.token.name)).toBeInTheDocument();
	});

	it('should not render my positions section when no vaults have balance', () => {
		vi.spyOn(harvestAutopilotsDerived, 'harvestAutopilots', 'get').mockReturnValue(
			readable([mockVaultWithoutBalance])
		);

		const { queryByText } = render(HarvestAutopilotOverview);

		expect(queryByText(en.stake.text.my_positions)).not.toBeInTheDocument();
	});

	it('should not render available autopilots section when all vaults have balance', () => {
		vi.spyOn(harvestAutopilotsDerived, 'harvestAutopilots', 'get').mockReturnValue(
			readable([mockVaultWithBalance])
		);

		const { queryByText } = render(HarvestAutopilotOverview);

		expect(queryByText(en.stake.text.available_autopilots)).not.toBeInTheDocument();
	});

	it('should render the info box', () => {
		const { getByText } = render(HarvestAutopilotOverview);

		expect(getByText(en.stake.info.harvest_autopilot.title)).toBeInTheDocument();
	});

	it('should render the back button', () => {
		const { getByRole } = render(HarvestAutopilotOverview);

		expect(getByRole('button', { name: 'icon' })).toBeInTheDocument();
	});
});
