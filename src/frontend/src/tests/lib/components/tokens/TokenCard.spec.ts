import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import TokenCard from '$lib/components/tokens/TokenCard.svelte';
import type { CardData } from '$lib/types/token-card';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render, screen } from '@testing-library/svelte';

describe('TokenCard', () => {
	const onNetworkText = (network: string) =>
		replacePlaceholders(en.tokens.text.on_network, { $network: network }).trim();

	it('should show the network for a token group header without listing member networks', () => {
		const data: CardData = {
			...USDC_TOKEN,
			networks: [USDC_TOKEN.network, ICP_NETWORK]
		};

		render(TokenCard, { props: { data } });

		expect(screen.getByText(USDC_TOKEN.name)).toBeInTheDocument();
		expect(screen.queryByText(onNetworkText(USDC_TOKEN.network.name))).not.toBeInTheDocument();
		expect(screen.queryByText(ICP_NETWORK.name)).not.toBeInTheDocument();
	});

	it('should show the network suffix for a top-level token by default', () => {
		render(TokenCard, { props: { data: USDC_TOKEN } });

		expect(screen.getByText(onNetworkText(USDC_TOKEN.network.name))).toBeInTheDocument();
	});

	it('should hide the network suffix for a top-level token when showNetwork is false', () => {
		render(TokenCard, { props: { data: USDC_TOKEN, showNetwork: false } });

		expect(screen.getByText(USDC_TOKEN.name)).toBeInTheDocument();
		expect(screen.queryByText(onNetworkText(USDC_TOKEN.network.name))).not.toBeInTheDocument();
	});

	it('should still show the network for a token rendered inside an expanded group (asNetwork)', () => {
		render(TokenCard, { props: { data: ETHEREUM_TOKEN, asNetwork: true, showNetwork: false } });

		expect(screen.getByText(onNetworkText(ETHEREUM_TOKEN.network.name))).toBeInTheDocument();
	});
});
