import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { allVaults } from '$eth/derived/vaults.derived';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import EarningsList from '$lib/components/earning/EarningsList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { EARNING_NO_POSITION_PLACEHOLDER } from '$lib/constants/test-ids.constants';
import * as networkDerived from '$lib/derived/network.derived';
import { tokenListStore } from '$lib/stores/token-list.store';
import type { Vault } from '$lib/types/vaults';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

vi.mock('$eth/constants/harvest-autopilots.constants', () => ({
	HARVEST_AUTOPILOT_ADDRESSES: ['0xautopilotaddress']
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('EarningsList', () => {
	const mockAutopilotToken: Erc4626CustomToken = {
		...mockValidErc4626Token,
		id: Symbol('AutopilotToken') as unknown as typeof mockValidErc4626Token.id,
		name: 'Autopilot Vault',
		address: '0xAutopilotAddress',
		enabled: true
	};

	const mockEnabledToken: Erc4626CustomToken = {
		...mockValidErc4626Token,
		id: Symbol('EnabledToken') as unknown as typeof mockValidErc4626Token.id,
		name: 'Enabled Vault',
		address: '0xEnabledAddress',
		enabled: true
	};

	const mockDisabledToken: Erc4626CustomToken = {
		...mockValidErc4626Token,
		id: Symbol('DisabledToken') as unknown as typeof mockValidErc4626Token.id,
		name: 'Disabled Vault',
		address: '0xDisabledAddress',
		enabled: false
	};

	const toVault = ({
		token,
		overrides
	}: {
		token: Erc4626CustomToken;
		overrides?: { usdBalance?: number; apy?: string };
	}): Vault => ({
		token: {
			...token,
			network: ETHEREUM_NETWORK,
			usdBalance: overrides?.usdBalance ?? 100,
			balance: ZERO
		},
		apy: overrides?.apy ?? '5.00'
	});

	const mockAllVaultsStore = (vaults: Vault[]) => {
		vi.spyOn(allVaults, 'subscribe').mockImplementation((fn) => {
			fn(vaults);
			return () => {};
		});
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		tokenListStore.set({ filter: '' });
	});

	it('should render the placeholder when there are no vaults', () => {
		mockAllVaultsStore([]);

		const { getByTestId } = render(EarningsList);

		expect(getByTestId(EARNING_NO_POSITION_PLACEHOLDER)).toBeInTheDocument();
	});

	it('should render the placeholder when all vaults have zero usd balance', () => {
		mockAllVaultsStore([toVault({ token: mockAutopilotToken, overrides: { usdBalance: 0 } })]);

		const { getByTestId } = render(EarningsList);

		expect(getByTestId(EARNING_NO_POSITION_PLACEHOLDER)).toBeInTheDocument();
	});

	it('should render vault cards for vaults with positive usd balance', () => {
		mockAllVaultsStore([
			toVault({ token: mockAutopilotToken }),
			toVault({ token: mockEnabledToken })
		]);

		const { getByText, queryByTestId } = render(EarningsList);

		expect(queryByTestId(EARNING_NO_POSITION_PLACEHOLDER)).not.toBeInTheDocument();
		expect(getByText('Autopilot Vault')).toBeInTheDocument();
		expect(getByText('Enabled Vault')).toBeInTheDocument();
	});

	it('should not display disabled non-autopilot vaults', () => {
		mockAllVaultsStore([toVault({ token: mockDisabledToken })]);

		const { getByTestId, queryByText } = render(EarningsList);

		expect(getByTestId(EARNING_NO_POSITION_PLACEHOLDER)).toBeInTheDocument();
		expect(queryByText('Disabled Vault')).not.toBeInTheDocument();
	});

	it('should display disabled harvest autopilot vaults with positive balance', () => {
		const disabledAutopilot: Erc4626CustomToken = {
			...mockAutopilotToken,
			enabled: false
		};

		mockAllVaultsStore([toVault({ token: disabledAutopilot })]);

		const { getByText, queryByTestId } = render(EarningsList);

		expect(queryByTestId(EARNING_NO_POSITION_PLACEHOLDER)).not.toBeInTheDocument();
		expect(getByText('Autopilot Vault')).toBeInTheDocument();
	});

	it('should filter out vaults with zero balance even if token is enabled', () => {
		mockAllVaultsStore([
			toVault({ token: mockEnabledToken, overrides: { usdBalance: 0 } }),
			toVault({ token: mockAutopilotToken, overrides: { usdBalance: 50 } })
		]);

		const { getByText, queryByText } = render(EarningsList);

		expect(queryByText('Enabled Vault')).not.toBeInTheDocument();
		expect(getByText('Autopilot Vault')).toBeInTheDocument();
	});

	it('should filter vaults by selected network', () => {
		vi.spyOn(networkDerived, 'selectedNetwork', 'get').mockReturnValue(readable(BASE_NETWORK));
		vi.spyOn(networkDerived, 'pseudoNetworkChainFusion', 'get').mockReturnValue(readable(false));

		const baseToken: Erc4626CustomToken = {
			...mockValidErc4626Token,
			id: Symbol('BaseToken') as unknown as typeof mockValidErc4626Token.id,
			name: 'Base Vault',
			address: '0xBaseAddress',
			enabled: true
		};

		mockAllVaultsStore([
			toVault({ token: mockEnabledToken }),
			{
				token: {
					...baseToken,
					network: BASE_NETWORK,
					usdBalance: 100,
					balance: ZERO
				},
				apy: '3.00'
			}
		]);

		const { getByText, queryByText } = render(EarningsList);

		expect(queryByText('Enabled Vault')).not.toBeInTheDocument();
		expect(getByText('Base Vault')).toBeInTheDocument();
	});

	it('should filter vaults by search query matching name', () => {
		mockAllVaultsStore([
			toVault({ token: mockAutopilotToken }),
			toVault({ token: mockEnabledToken })
		]);

		tokenListStore.set({ filter: 'Autopilot' });

		const { getByText, queryByText } = render(EarningsList);

		expect(getByText('Autopilot Vault')).toBeInTheDocument();
		expect(queryByText('Enabled Vault')).not.toBeInTheDocument();
	});

	it('should filter vaults by search query matching symbol', () => {
		const tokenWithUniqueSymbol: Erc4626CustomToken = {
			...mockEnabledToken,
			symbol: 'UNIQ'
		};

		mockAllVaultsStore([
			toVault({ token: mockAutopilotToken }),
			toVault({ token: tokenWithUniqueSymbol })
		]);

		tokenListStore.set({ filter: 'UNIQ' });

		const { getByText, queryByText } = render(EarningsList);

		expect(queryByText('Autopilot Vault')).not.toBeInTheDocument();
		expect(getByText('Enabled Vault')).toBeInTheDocument();
	});

	it('should show all vaults when search query is empty', () => {
		mockAllVaultsStore([
			toVault({ token: mockAutopilotToken }),
			toVault({ token: mockEnabledToken })
		]);

		tokenListStore.set({ filter: '' });

		const { getByText } = render(EarningsList);

		expect(getByText('Autopilot Vault')).toBeInTheDocument();
		expect(getByText('Enabled Vault')).toBeInTheDocument();
	});

	it('should show all non-testnet vaults when no network is selected (chain fusion)', () => {
		vi.spyOn(networkDerived, 'selectedNetwork', 'get').mockReturnValue(readable(undefined));
		vi.spyOn(networkDerived, 'pseudoNetworkChainFusion', 'get').mockReturnValue(readable(true));

		const baseToken: Erc4626CustomToken = {
			...mockValidErc4626Token,
			id: Symbol('BaseToken') as unknown as typeof mockValidErc4626Token.id,
			name: 'Base Vault',
			address: '0xBaseAddress',
			enabled: true
		};

		mockAllVaultsStore([
			toVault({ token: mockEnabledToken }),
			{
				token: {
					...baseToken,
					network: BASE_NETWORK,
					usdBalance: 100,
					balance: ZERO
				},
				apy: '3.00'
			}
		]);

		const { getByText } = render(EarningsList);

		expect(getByText('Enabled Vault')).toBeInTheDocument();
		expect(getByText('Base Vault')).toBeInTheDocument();
	});
});
