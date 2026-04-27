import HarvestAutopilotDetail from '$eth/components/stake/harvest-autopilot/HarvestAutopilotDetail.svelte';
import * as erc20Derived from '$eth/derived/erc20.derived';
import * as harvestAutopilotsDerived from '$eth/derived/harvest-autopilots.derived';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import { ZERO } from '$lib/constants/app.constants';
import * as addressDerived from '$lib/derived/address.derived';
import * as exchangeDerived from '$lib/derived/exchange.derived';
import * as navDerived from '$lib/derived/nav.derived';
import * as tokensUiDerived from '$lib/derived/tokens-ui.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Vault } from '$lib/types/vaults';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
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

	const mockAssetToken: Erc20CustomToken = {
		...mockValidErc20Token,
		address: mockValidErc4626Token.assetAddress,
		enabled: true
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

		vi.spyOn(erc20Derived, 'erc20Tokens', 'get').mockReturnValue(readable([]));
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

	it('should not render get token, stake, or unstake buttons when asset token is not found', () => {
		const { queryByText } = render(HarvestAutopilotDetail);

		expect(queryByText(`Get ${mockAssetToken.symbol}`)).not.toBeInTheDocument();
		expect(queryByText(en.stake.text.stake)).not.toBeInTheDocument();
		expect(queryByText(en.stake.text.unstake)).not.toBeInTheDocument();
	});

	it('should render the get token button when asset token is found', () => {
		vi.spyOn(erc20Derived, 'erc20Tokens', 'get').mockReturnValue(readable([mockAssetToken]));

		const { getByText } = render(HarvestAutopilotDetail);

		expect(getByText(`Get ${mockAssetToken.symbol}`)).toBeInTheDocument();
	});

	it('should not render the stake button when asset token balance is zero', () => {
		vi.spyOn(erc20Derived, 'erc20Tokens', 'get').mockReturnValue(readable([mockAssetToken]));

		const { queryByText } = render(HarvestAutopilotDetail);

		expect(queryByText(en.stake.text.stake)).not.toBeInTheDocument();
	});

	it('should render the stake button when asset token balance is greater than zero', () => {
		vi.spyOn(erc20Derived, 'erc20Tokens', 'get').mockReturnValue(readable([mockAssetToken]));

		balancesStore.set({
			id: mockAssetToken.id,
			data: { data: 1000000n, certified: false }
		});

		const { getByText } = render(HarvestAutopilotDetail);

		expect(getByText(en.stake.text.stake)).toBeInTheDocument();

		balancesStore.reset(mockAssetToken.id);
	});

	it('should render the unstake button when vault balance is greater than zero and exchange data is available', () => {
		vi.spyOn(erc20Derived, 'erc20Tokens', 'get').mockReturnValue(readable([mockAssetToken]));

		vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(
			readable({
				[mockVault.token.id]: { usd: 1, usd_market_cap: 0, assets_per_share: 1.0 }
			} as ExchangesData)
		);

		const { getByText } = render(HarvestAutopilotDetail);

		expect(getByText(en.stake.text.unstake)).toBeInTheDocument();
	});

	it('should not render the unstake button when vault balance is greater than zero but exchange data is missing', () => {
		vi.spyOn(erc20Derived, 'erc20Tokens', 'get').mockReturnValue(readable([mockAssetToken]));

		vi.spyOn(exchangeDerived, 'exchanges', 'get').mockReturnValue(readable({} as ExchangesData));

		const { queryByText } = render(HarvestAutopilotDetail);

		expect(queryByText(en.stake.text.unstake)).not.toBeInTheDocument();
	});

	it('should not render the unstake button when vault balance is zero', () => {
		vi.spyOn(erc20Derived, 'erc20Tokens', 'get').mockReturnValue(readable([mockAssetToken]));

		const zeroBalanceVault: Vault = {
			...mockVault,
			token: { ...mockVault.token, balance: ZERO }
		};

		vi.spyOn(harvestAutopilotsDerived, 'harvestAutopilots', 'get').mockReturnValue(
			readable([zeroBalanceVault])
		);

		const { queryByText } = render(HarvestAutopilotDetail);

		expect(queryByText(en.stake.text.unstake)).not.toBeInTheDocument();
	});
});
