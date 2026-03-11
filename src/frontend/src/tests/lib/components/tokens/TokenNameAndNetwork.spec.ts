import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import TokenNameAndNetwork from '$lib/components/tokens/TokenNameAndNetwork.svelte';
import type { CardData } from '$lib/types/token-card';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render, screen } from '@testing-library/svelte';

describe('TokenNameAndNetwork', () => {
	const renderComponent = (data: CardData) => render(TokenNameAndNetwork, { props: { data } });

	it('should render token name', () => {
		renderComponent(USDC_TOKEN);

		expect(screen.getByText(USDC_TOKEN.name)).toBeInTheDocument();
	});

	it('should render oisy token name when available', () => {
		const oisyName = 'Wrapped USD Coin';

		renderComponent({
			...USDC_TOKEN,
			oisyName: { oisyName }
		});

		expect(screen.getByText(oisyName)).toBeInTheDocument();
	});

	it('should render network name when token name differs from network name', () => {
		renderComponent(USDC_TOKEN);

		expect(
			screen.getByText(
				replacePlaceholders(en.tokens.text.on_network, {
					$network: USDC_TOKEN.network.name
				}).trim()
			)
		).toBeInTheDocument();
	});

	it('should not render network name when token name matches network name', () => {
		renderComponent(ETHEREUM_TOKEN);

		expect(
			screen.queryByText(
				replacePlaceholders(en.tokens.text.on_network, {
					$network: ETHEREUM_TOKEN.network.name
				}).trim()
			)
		).not.toBeInTheDocument();
	});
});
