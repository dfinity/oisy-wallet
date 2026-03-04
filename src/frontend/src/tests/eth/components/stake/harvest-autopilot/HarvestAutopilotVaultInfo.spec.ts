import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import HarvestAutopilotVaultInfo from '$eth/components/stake/harvest-autopilot/HarvestAutopilotVaultInfo.svelte';
import { HARVEST_AUTOPILOT_URL } from '$eth/constants/harvest-autopilots.constants';
import type { Vault } from '$lib/types/vaults';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('HarvestAutopilotVaultInfo', () => {
	const mockVault: Vault = {
		token: {
			...mockValidErc4626Token,
			enabled: true,
			version: 1n,
			usdBalance: 100,
			balance: 100n
		},
		apy: '5.5',
		totalValueLocked: '184665.22'
	};

	const props = { vault: mockVault };

	it('should render the vault info title', () => {
		const { getByText } = render(HarvestAutopilotVaultInfo, { props });

		expect(getByText(en.stake.text.vault_info)).toBeInTheDocument();
	});

	it('should render the info link text', () => {
		const { getByText } = render(HarvestAutopilotVaultInfo, { props });

		expect(getByText(en.core.text.info)).toBeInTheDocument();
	});

	it('should render the external links with correct href', () => {
		const { getAllByRole } = render(HarvestAutopilotVaultInfo, { props });

		const expectedHref = `${HARVEST_AUTOPILOT_URL}${mockVault.token.network.name.toLowerCase()}/${mockVault.token.address}`;

		const links = getAllByRole('link', { name: en.stake.text.vault_info });

		expect(links).toHaveLength(2);

		links.forEach((link) => {
			expect(link).toHaveAttribute('href', expectedHref);
		});
	});

	it('should render the vault description with asset symbol', () => {
		const { getByText } = render(HarvestAutopilotVaultInfo, { props });

		const expectedDescription = replacePlaceholders(en.stake.text.vault_description, {
			$asset_symbol: mockVault.token.assetSymbol
		});

		expect(getByText(expectedDescription)).toBeInTheDocument();
	});

	it('should render the network name', () => {
		const { getByText } = render(HarvestAutopilotVaultInfo, { props });

		expect(getByText(ETHEREUM_NETWORK.name)).toBeInTheDocument();
	});

	it('should render the asset label and symbol', () => {
		const { getByText } = render(HarvestAutopilotVaultInfo, { props });

		expect(getByText(en.core.text.asset)).toBeInTheDocument();
		expect(getByText(mockVault.token.assetSymbol)).toBeInTheDocument();
	});

	it('should render the vault address label and shortened address', () => {
		const { getByText } = render(HarvestAutopilotVaultInfo, { props });

		expect(getByText(en.stake.text.vault_address)).toBeInTheDocument();
		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockVault.token.address }))
		).toBeInTheDocument();
	});

	it('should render the protocol label and autopilot value', () => {
		const { getByText } = render(HarvestAutopilotVaultInfo, { props });

		expect(getByText(en.stake.text.protocol)).toBeInTheDocument();
		expect(getByText(en.stake.text.autopilot)).toBeInTheDocument();
	});

	it('should render total value locked when provided', () => {
		const { getByText } = render(HarvestAutopilotVaultInfo, { props });

		expect(getByText(en.stake.text.total_value_locked)).toBeInTheDocument();
	});

	it('should not render total value locked when not provided', () => {
		const vaultWithoutTvl: Vault = {
			...mockVault,
			totalValueLocked: undefined
		};

		const { queryByText } = render(HarvestAutopilotVaultInfo, {
			props: { vault: vaultWithoutTvl }
		});

		expect(queryByText(en.stake.text.total_value_locked)).not.toBeInTheDocument();
	});
});
