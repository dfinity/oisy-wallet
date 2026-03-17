import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import HarvestStakeEstimations from '$eth/components/stake/harvest-autopilot/HarvestStakeEstimations.svelte';
import {
	CONVERT_AMOUNT_DISPLAY_VALUE,
	CONVERT_AMOUNT_EXCHANGE_VALUE
} from '$lib/constants/test-ids.constants';
import * as exchanges from '$lib/derived/exchange.derived';
import type { Vault } from '$lib/types/vaults';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('HarvestStakeEstimations', () => {
	const mockVaultToken = {
		...mockValidErc4626Token,
		address: '0xvaultAddress',
		network: ETHEREUM_NETWORK,
		enabled: true,
		usdPrice: 2
	};

	const mockVault: Vault = {
		token: mockVaultToken,
		apy: '10'
	};

	const mockAssetsPerShare = 1.5;

	const mockExchangeWithAssetsPerShare = () =>
		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() =>
			readable({
				[mockVaultToken.id]: {
					usd: 2,
					usd_market_cap: 100_000_000,
					assets_per_share: mockAssetsPerShare
				}
			})
		);

	const mockExchangeWithoutAssetsPerShare = () =>
		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() =>
			readable({
				[mockVaultToken.id]: { usd: 2 }
			})
		);

	const mockEmptyExchange = () =>
		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() => readable({}));

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should render estimated yearly yield and estimated received when all data is available', () => {
		mockExchangeWithAssetsPerShare();

		const { getByText } = render(HarvestStakeEstimations, {
			props: { amount: 100, vault: mockVault }
		});

		expect(getByText(en.stake.text.estimated_yearly_yield)).toBeInTheDocument();
		expect(getByText(en.stake.text.estimated_received)).toBeInTheDocument();
	});

	it('should not render anything when amount is undefined', () => {
		mockExchangeWithAssetsPerShare();

		const { queryByText } = render(HarvestStakeEstimations, {
			props: { amount: undefined, vault: mockVault }
		});

		expect(queryByText(en.stake.text.estimated_yearly_yield)).not.toBeInTheDocument();
		expect(queryByText(en.stake.text.estimated_received)).not.toBeInTheDocument();
	});

	it('should not render anything when exchange has no assets_per_share', () => {
		mockExchangeWithoutAssetsPerShare();

		const { queryByText } = render(HarvestStakeEstimations, {
			props: { amount: 100, vault: mockVault }
		});

		expect(queryByText(en.stake.text.estimated_yearly_yield)).not.toBeInTheDocument();
		expect(queryByText(en.stake.text.estimated_received)).not.toBeInTheDocument();
	});

	it('should not render anything when exchange data is missing', () => {
		mockEmptyExchange();

		const { queryByText } = render(HarvestStakeEstimations, {
			props: { amount: 100, vault: mockVault }
		});

		expect(queryByText(en.stake.text.estimated_yearly_yield)).not.toBeInTheDocument();
		expect(queryByText(en.stake.text.estimated_received)).not.toBeInTheDocument();
	});

	it('should not render anything when vault has no apy', () => {
		mockExchangeWithAssetsPerShare();

		const vaultWithoutApy: Vault = {
			...mockVault,
			apy: undefined
		};

		const { queryByText } = render(HarvestStakeEstimations, {
			props: { amount: 100, vault: vaultWithoutApy }
		});

		expect(queryByText(en.stake.text.estimated_yearly_yield)).not.toBeInTheDocument();
		expect(queryByText(en.stake.text.estimated_received)).not.toBeInTheDocument();
	});

	it('should render ConvertAmountDisplay with correct shares to receive', () => {
		mockExchangeWithAssetsPerShare();

		const amount = 150;
		const expectedShares = amount / mockAssetsPerShare;

		const { getByTestId } = render(HarvestStakeEstimations, {
			props: { amount, vault: mockVault }
		});

		const displayValue = getByTestId(CONVERT_AMOUNT_DISPLAY_VALUE);

		expect(displayValue).toBeInTheDocument();
		expect(displayValue.textContent).toContain(String(expectedShares));
	});

	it('should render ConvertAmountExchange for yearly yield and estimated received', () => {
		mockExchangeWithAssetsPerShare();

		const { getAllByTestId } = render(HarvestStakeEstimations, {
			props: { amount: 100, vault: mockVault }
		});

		const exchangeValues = getAllByTestId(CONVERT_AMOUNT_EXCHANGE_VALUE);

		expect(exchangeValues).toHaveLength(2);
	});
});
