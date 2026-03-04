import { BAUTOPILOT_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc4626/tokens.bautopilot_usdc.env';
import VaultCard from '$lib/components/vaults/VaultCard.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { Vault } from '$lib/types/vaults';
import { formatToken } from '$lib/utils/format.utils';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('VaultCard', () => {
	const mockVault: Vault = {
		token: {
			...mockValidErc4626Token,
			enabled: true,
			version: 1n,
			usdBalance: 0,
			balance: ZERO
		},
		apy: '5.5'
	};

	beforeEach(() => {
		exchangeStore.reset();
	});

	it('should render the token display name', () => {
		const { getByText } = render(VaultCard, { props: { data: mockVault } });

		expect(getByText(mockVault.token.name)).toBeInTheDocument();
	});

	it('should render the live APY badge when apy is provided', () => {
		const { getByText } = render(VaultCard, { props: { data: mockVault } });

		expect(getByText(`${en.vaults.text.live_apy} ${mockVault.apy}%`)).toBeInTheDocument();
	});

	it('should not render the live APY badge when apy is undefined', () => {
		const vaultWithoutApy: Vault = { ...mockVault, apy: undefined };

		const { queryByText } = render(VaultCard, { props: { data: vaultWithoutApy } });

		expect(queryByText(en.vaults.text.live_apy, { exact: false })).not.toBeInTheDocument();
	});

	it('should render the asset symbol when exchange is initialized', () => {
		exchangeStore.set([{ [mockVault.token.id]: { usd: 1 } }]);

		const { getByText } = render(VaultCard, { props: { data: mockVault } });

		const expectedText = `${formatToken({ value: ZERO, unitName: mockVault.token.decimals })} ${mockVault.token.assetSymbol}`;

		expect(getByText(expectedText)).toBeInTheDocument();
	});

	it('should not render the autopilot badge for non-harvest tokens', () => {
		const { queryByText } = render(VaultCard, { props: { data: mockVault } });

		expect(queryByText(en.vaults.text.autopilot)).not.toBeInTheDocument();
	});

	it('should render the autopilot badge for harvest autopilot tokens', () => {
		const harvestVault: Vault = {
			...mockVault,
			token: {
				...BAUTOPILOT_USDC_TOKEN,
				enabled: true,
				version: 1n,
				usdBalance: 0,
				balance: ZERO
			}
		};

		const { getByText } = render(VaultCard, { props: { data: harvestVault } });

		expect(getByText(en.vaults.text.autopilot)).toBeInTheDocument();
	});
});
