import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { MODAL_TOKEN_LIST_DEFAULT_NO_RESULTS } from '$lib/constants/test-ids.constants';
import type { Token } from '$lib/types/token';
import ModalTokensListHost from '$tests/lib/components/tokens/ModalTokensListTestHost.svelte';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

// Test IDs
export const MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS = 'modal-token-list-custom-no-results';
export const MODAL_TOKEN_LIST_ITEM_PREFIX = 'modal-token-list-item-';
export const MODAL_TOKEN_LIST_TOOLBAR = 'modal-token-list-toolbar';

const mockTokens: Token[] = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

describe('ModalTokensList', () => {
	const baseProps = {
		onSelectNetworkFilter: vi.fn(),
		onTokenButtonClick: vi.fn()
	};

	it('renders tokens passed as props', () => {
		const { findByTestId } = render(ModalTokensListHost, {
			props: {
				...baseProps,
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
				...baseProps,
				tokens: mockTokens,
				renderNoResults: false
			}
		});

		await expect(findByTestId(MODAL_TOKEN_LIST_TOOLBAR)).resolves.toBeInTheDocument();
	});

	it('shows default no-results message when snippet is not provided', () => {
		const { findByTestId } = render(ModalTokensListHost, {
			props: {
				...baseProps,
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
				...baseProps,
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
				...baseProps,
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
			props: { ...baseProps, tokens: mockTokens, renderNoResults: true }
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
				...baseProps,
				tokens: mockTokens,
				renderNoResults: false,
				onTokenButtonClick: handler
			}
		});

		const btcButton = await findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}BTC`);
		await fireEvent.click(btcButton);

		expect(handler).toHaveBeenCalledExactlyOnceWith(BTC_MAINNET_TOKEN);
	});

	it('dispatches icSelectNetworkFilter when network button is clicked', async () => {
		const handler = vi.fn();

		render(ModalTokensListHost, {
			props: {
				...baseProps,
				tokens: mockTokens,
				renderNoResults: false,
				onSelectNetworkFilter: handler
			}
		});

		const networkButton = document.querySelector('button.dropdown-button');

		expect(networkButton).toBeInTheDocument();

		if (networkButton) {
			await fireEvent.click(networkButton);

			expect(handler).toHaveBeenCalledOnce();
		}
	});

	it('should only render Nfts if filterNfts is true', () => {
		const { container, getByTestId } = render(ModalTokensListHost, {
			props: {
				...baseProps,
				tokens: [
					...mockTokens,
					{ ...mockValidErc1155Token, symbol: 'ERC1155' },
					{ ...mockValidErc721Token, symbol: 'ERC721' }
				],
				renderNoResults: false,
				filterNfts: true
			}
		});

		const items = container.querySelectorAll('ul>li');

		expect(items).toHaveLength(2);

		expect(getByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}ERC1155`)).toBeInTheDocument();
		expect(getByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}ERC721`)).toBeInTheDocument();
	});
});
