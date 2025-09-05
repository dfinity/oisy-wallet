import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { MODAL_TOKEN_LIST_DEFAULT_NO_RESULTS } from '$lib/constants/test-ids.constants';
import type { Token } from '$lib/types/token';
import ModalTokensListHost from '$tests/lib/components/tokens/ModalTokensListTestHost.svelte';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

// Test IDs
export const MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS = 'modal-token-list-custom-no-results';
export const MODAL_TOKEN_LIST_ITEM_PREFIX = 'modal-token-list-item-';
export const MODAL_TOKEN_LIST_TOOLBAR = 'modal-token-list-toolbar';

const mockTokens: Token[] = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

describe('ModalTokensList', () => {
	it('renders tokens passed as props', () => {
		const { findByTestId } = render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: false
			}
		});

		mockTokens.forEach(async (token) => {
			const el = await findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}${token.symbol}`);

			expect(el).toBeInTheDocument();
		});
	});

	it('renders toolbar snippet', async () => {
		const { findByTestId } = render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: false
			}
		});

		await expect(findByTestId(MODAL_TOKEN_LIST_TOOLBAR)).resolves.toBeInTheDocument();
	});

	it('shows default no-results message when snippet is not provided', () => {
		const { findByTestId } = render(ModalTokensListHost, {
			props: {
				tokens: [],
				renderNoResults: false
			}
		});

		waitFor(async () => {
			const el = await findByTestId(MODAL_TOKEN_LIST_DEFAULT_NO_RESULTS);

			expect(el).toBeInTheDocument();
		});
	});

	it('shows custom no results message when no tokens match', () => {
		const { findByTestId } = render(ModalTokensListHost, {
			props: {
				tokens: [], // no tokens
				renderNoResults: true
			}
		});

		waitFor(async () => {
			const el = await findByTestId(MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS);

			expect(el).toBeInTheDocument();
		});
	});

	it('filters tokens via search input', async () => {
		const { findByTestId, queryByTestId, findByPlaceholderText } = render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: true
			}
		});

		const searchInput = await findByPlaceholderText('Search for the token');

		await fireEvent.input(searchInput, { target: { value: 'BTC' } });

		await expect(findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}BTC`)).resolves.toBeInTheDocument();
		expect(queryByTestId('list-item-ETH')).not.toBeInTheDocument();
	});

	it('shows no-results message when search returns no matches', async () => {
		const { findByPlaceholderText, findByTestId } = render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: true
			}
		});

		const searchInput = await findByPlaceholderText('Search for the token');

		await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

		waitFor(async () => {
			const el = await findByTestId(MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS);

			expect(el).toBeInTheDocument();
		});
	});

	it('dispatches icTokenButtonClick when token is clicked', async () => {
		const handler = vi.fn();

		const { findByTestId } = render(ModalTokensListHost, {
			props: {
				tokens: mockTokens,
				renderNoResults: false
			},
			events: {
				icTokenButtonClick: handler
			}
		});

		const btcButton = await findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}BTC`);
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
