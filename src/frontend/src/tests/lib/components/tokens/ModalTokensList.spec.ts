import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { Token } from '$lib/types/token';
import ModalTokensListHost from '$tests/lib/components/tokens/ModalTokensListHost.svelte';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { expect } from 'vitest';

window.matchMedia = vi.fn().mockImplementation((query) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: vi.fn(), // Deprecated
	removeListener: vi.fn(), // Deprecated
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	dispatchEvent: vi.fn()
}));

const mockTokens: Token[] = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

describe('ModalTokensList', () => {
	it('renders tokens passed as props', async () => {
		render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: false
			}
		});

		for (const token of mockTokens) {
			expect(await screen.findByTestId(`list-item-${token.symbol}`)).toBeInTheDocument();
		}
	});

	it('renders toolbar snippet', async () => {
		render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: false
			}
		});

		expect(await screen.findByTestId('toolbar')).toBeInTheDocument();
	});

	it('shows default no-results message when snippet is not provided', async () => {
		render(ModalTokensListHost, {
			props: {
				tokens: [],
				renderNoResults: false
			}
		});

		waitFor(async () => {
			const el = await screen.findByTestId('default-no-results-message');
			expect(el).toBeInTheDocument();
		});
	});

	it('shows custom no results message when no tokens match', async () => {
		render(ModalTokensListHost, {
			props: {
				tokens: [], // no tokens
				renderNoResults: true
			}
		});

		waitFor(async () => {
			const el = await screen.findByTestId('custom-no-results');
			expect(el).toBeInTheDocument();
		});
	});

	it('filters tokens via search input', async () => {
		render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: true
			}
		});

		const searchInput = await screen.findByPlaceholderText('Search for the token');

		await fireEvent.input(searchInput, { target: { value: 'BTC' } });

		expect(await screen.findByTestId('list-item-BTC')).toBeInTheDocument();
		expect(screen.queryByTestId('list-item-ETH')).not.toBeInTheDocument();
	});

	it('shows no-results message when search returns no matches', async () => {
		render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: true
			}
		});

		const searchInput = await screen.findByPlaceholderText('Search for the token');

		await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

		waitFor(async () => {
			const el = await screen.findByTestId('custom-no-results');
			expect(el).toBeInTheDocument();
		});
	});

	it('dispatches icTokenButtonClick when token is clicked', async () => {
		const handler = vi.fn();

		render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: false
			},
			events: {
				icTokenButtonClick: handler
			}
		});

		const btcButton = await screen.findByTestId('list-item-BTC');
		await fireEvent.click(btcButton);

		expect(handler).toHaveBeenCalledExactlyOnceWith(
			new CustomEvent('icTokenButtonClick', { detail: BTC_MAINNET_TOKEN })
		);
	});

	it('dispatches icSelectNetworkFilter when network button is clicked', async () => {
		const handler = vi.fn();

		render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: false
			},
			events: {
				icSelectNetworkFilter: handler
			}
		});

		const networkButton = document.querySelector('button.dropdown-button');
		expect(networkButton).toBeInTheDocument();
		if (networkButton) {
			await fireEvent.click(networkButton);

			expect(handler).toHaveBeenCalledOnce();
		}
	});
});
