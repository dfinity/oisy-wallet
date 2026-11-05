import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import {
	MODAL_TOKEN_LIST_CLEAR_FILTERS,
	MODAL_TOKEN_LIST_NO_MATCH,
	NETWORK_FILTER,
	TOKEN_CATEGORY_FILTER
} from '$lib/constants/test-ids.constants';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import ModalTokensListHost from '$tests/lib/components/tokens/ModalTokensListTestHost.svelte';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Test IDs
export const MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS = 'modal-token-list-custom-no-results';
export const MODAL_TOKEN_LIST_ITEM_PREFIX = 'modal-token-list-item-';
export const MODAL_TOKEN_LIST_TOOLBAR = 'modal-token-list-toolbar';

const mockTokens: Token[] = [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

describe('ModalTokensList', () => {
	const baseProps = {
		onTokenButtonClick: vi.fn()
	};

	const networks = [BTC_MAINNET_NETWORK, ETHEREUM_NETWORK];

	it('renders tokens passed as props', async () => {
		const { findByTestId } = render(ModalTokensListHost, {
			props: {
				...baseProps,
				tokens: mockTokens,
				renderNoResults: false
			}
		});

		for (const token of mockTokens) {
			const el = await findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}${token.symbol}`);

			expect(el).toBeInTheDocument();
		}
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

	it('shows custom no results message when no tokens match', async () => {
		const { findByTestId } = render(ModalTokensListHost, {
			props: {
				...baseProps,
				tokens: [], // no tokens
				renderNoResults: true
			}
		});

		await expect(findByTestId(MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS)).resolves.toBeInTheDocument();
	});

	it('filters tokens via search input', async () => {
		const { findByTestId, queryByTestId, findByPlaceholderText } = render(ModalTokensListHost, {
			props: {
				...baseProps,
				tokens: mockTokens,
				renderNoResults: true
			}
		});

		const searchInput = await findByPlaceholderText(get(i18n).tokens.placeholder.search_token);

		await fireEvent.input(searchInput, { target: { value: 'BTC' } });

		await expect(findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}BTC`)).resolves.toBeInTheDocument();
		expect(queryByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}ETH`)).not.toBeInTheDocument();
	});

	it('names the search that matched nothing', async () => {
		const { findByPlaceholderText, findByTestId, queryByTestId } = render(ModalTokensListHost, {
			props: { ...baseProps, tokens: mockTokens, renderNoResults: true }
		});

		const searchInput = await findByPlaceholderText(get(i18n).tokens.placeholder.search_token);

		await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

		const noMatch = await findByTestId(MODAL_TOKEN_LIST_NO_MATCH);

		expect(noMatch).toHaveTextContent(
			replacePlaceholders(get(i18n).tokens.text.no_match_query, { $query: 'nonexistent' })
		);
		expect(queryByTestId(MODAL_TOKEN_LIST_CLEAR_FILTERS)).not.toBeInTheDocument();
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

	describe('network filter', () => {
		it('filters by the network picked in the dropdown', async () => {
			const { getByTestId, findByTestId, queryByTestId, findByPlaceholderText } = render(
				ModalTokensListHost,
				{
					props: { ...baseProps, tokens: mockTokens, renderNoResults: false, networks }
				}
			);

			const trigger = getByTestId(`${NETWORK_FILTER}-trigger`);

			await fireEvent.click(trigger);

			expect(trigger).toHaveAttribute('aria-expanded', 'true');

			const panel = await findByTestId('popover-content');

			await fireEvent.click(within(panel).getByText(BTC_MAINNET_NETWORK.name));

			await expect(findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}BTC`)).resolves.toBeInTheDocument();
			expect(queryByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}ETH`)).not.toBeInTheDocument();
			expect(getByTestId(NETWORK_FILTER)).toHaveTextContent(BTC_MAINNET_NETWORK.name);
			await expect(
				findByPlaceholderText(
					replacePlaceholders(get(i18n).tokens.placeholder.search_token_on_network, {
						$network: BTC_MAINNET_NETWORK.name
					})
				)
			).resolves.toBeInTheDocument();
		});

		it('clears the network with the clear button and moves focus to the chip', async () => {
			const { getByTestId, findByTestId } = render(ModalTokensListHost, {
				props: {
					...baseProps,
					tokens: mockTokens,
					renderNoResults: false,
					networks,
					filterNetwork: BTC_MAINNET_NETWORK
				}
			});

			await fireEvent.click(getByTestId(`${NETWORK_FILTER}-clear`));

			await expect(findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}ETH`)).resolves.toBeInTheDocument();
			expect(getByTestId(NETWORK_FILTER)).toHaveTextContent(get(i18n).networks.chain_fusion);
			expect(getByTestId(`${NETWORK_FILTER}-trigger`)).toHaveFocus();
		});

		it('hands focus back to the chip when Escape closes the dropdown', async () => {
			const { getByTestId, findByTestId, queryByTestId } = render(ModalTokensListHost, {
				props: { ...baseProps, tokens: mockTokens, renderNoResults: false, networks }
			});

			const trigger = getByTestId(`${NETWORK_FILTER}-trigger`);

			await fireEvent.click(trigger);
			await findByTestId('popover-content');

			await fireEvent.keyDown(document, { key: 'Escape' });

			await waitFor(() => expect(queryByTestId('popover-content')).not.toBeInTheDocument());

			expect(trigger).toHaveFocus();
		});

		it('keeps the clear button out of reach while no network is picked', () => {
			const { getByTestId } = render(ModalTokensListHost, {
				props: { ...baseProps, tokens: mockTokens, renderNoResults: false, networks }
			});

			// jsdom keeps `inert` as a property only; browsers reflect it to the attribute.
			expect(getByTestId(`${NETWORK_FILTER}-clear`)).toHaveProperty('inert', true);
		});

		it('shows a locked network as a label, not a control', () => {
			const { getByTestId, queryByTestId } = render(ModalTokensListHost, {
				props: {
					...baseProps,
					tokens: mockTokens,
					renderNoResults: false,
					networkSelectorViewOnly: true,
					filterNetwork: BTC_MAINNET_NETWORK
				}
			});

			expect(getByTestId(NETWORK_FILTER)).toHaveTextContent(BTC_MAINNET_NETWORK.name);
			expect(queryByTestId(`${NETWORK_FILTER}-trigger`)).not.toBeInTheDocument();
			expect(queryByTestId(`${NETWORK_FILTER}-clear`)).not.toBeInTheDocument();
		});

		it('shows no network filter when locked to all networks', () => {
			const { queryByTestId } = render(ModalTokensListHost, {
				props: {
					...baseProps,
					tokens: mockTokens,
					renderNoResults: false,
					networkSelectorViewOnly: true
				}
			});

			expect(queryByTestId(NETWORK_FILTER)).not.toBeInTheDocument();
		});
	});

	describe('filters that hide every token', () => {
		it('names the filters and offers to clear them', async () => {
			const { findByTestId, getByTestId } = render(ModalTokensListHost, {
				props: {
					...baseProps,
					tokens: [ETHEREUM_TOKEN],
					renderNoResults: true,
					networks,
					filterNetwork: BTC_MAINNET_NETWORK
				}
			});

			await expect(findByTestId(MODAL_TOKEN_LIST_NO_MATCH)).resolves.toHaveTextContent(
				replacePlaceholders(get(i18n).tokens.text.no_match_network, {
					$network: BTC_MAINNET_NETWORK.name
				})
			);

			await fireEvent.click(getByTestId(MODAL_TOKEN_LIST_CLEAR_FILTERS));

			await expect(findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}ETH`)).resolves.toBeInTheDocument();
		});

		it('never clears a locked network', async () => {
			const { findByTestId, queryByTestId } = render(ModalTokensListHost, {
				props: {
					...baseProps,
					tokens: [ETHEREUM_TOKEN],
					renderNoResults: true,
					networkSelectorViewOnly: true,
					filterNetwork: BTC_MAINNET_NETWORK
				}
			});

			await expect(findByTestId(MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS)).resolves.toBeInTheDocument();
			expect(queryByTestId(MODAL_TOKEN_LIST_CLEAR_FILTERS)).not.toBeInTheDocument();
		});

		it('offers no way out that would still show nothing', async () => {
			// The search matches a testnet token only, which all networks (mainnets) leaves out too.
			const { findByTestId, queryByTestId } = render(ModalTokensListHost, {
				props: {
					...baseProps,
					tokens: [ETHEREUM_TOKEN, BTC_TESTNET_TOKEN],
					renderNoResults: true,
					networks,
					filterNetwork: ETHEREUM_NETWORK,
					filterQuery: 'Testnet'
				}
			});

			await expect(findByTestId(MODAL_TOKEN_LIST_NO_MATCH)).resolves.toBeInTheDocument();
			expect(queryByTestId(MODAL_TOKEN_LIST_CLEAR_FILTERS)).not.toBeInTheDocument();
		});
	});

	describe('asset type filter', () => {
		it('offers only the asset types the list holds', async () => {
			const { getByTestId, findByTestId } = render(ModalTokensListHost, {
				props: { ...baseProps, tokens: mockTokens, renderNoResults: false }
			});

			await fireEvent.click(getByTestId(`${TOKEN_CATEGORY_FILTER}-trigger`));

			const panel = await findByTestId('popover-content');

			expect(within(panel).getByText(get(i18n).token_tag.category.crypto)).toBeInTheDocument();
			expect(within(panel).queryByText(get(i18n).token_tag.category.stock)).not.toBeInTheDocument();
		});

		it('drops an asset type the list does not hold', async () => {
			const { findByTestId, getByTestId } = render(ModalTokensListHost, {
				props: {
					...baseProps,
					tokens: mockTokens,
					renderNoResults: false,
					filterCategoryTag: TokenCategoryTagValue.STOCK
				}
			});

			await expect(findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}BTC`)).resolves.toBeInTheDocument();
			expect(getByTestId(TOKEN_CATEGORY_FILTER)).toHaveTextContent(
				get(i18n).tokens.text.asset_type_all_short
			);
		});
	});

	describe('asset types of tokens the list leaves out', () => {
		// A stock with no balance, in a picker that shows funded tokens only.
		const unfundedStock: Token = {
			...ETHEREUM_TOKEN,
			id: parseTokenId('mock-unfunded-stock'),
			symbol: 'MSTK',
			tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }]
		};

		beforeEach(() => {
			balancesStore.set({ id: BTC_MAINNET_TOKEN.id, data: { data: 100n, certified: true } });
		});

		afterEach(() => {
			balancesStore.reset(BTC_MAINNET_TOKEN.id);
		});

		it('neither offers nor applies them', async () => {
			const { findByTestId, getByTestId } = render(ModalTokensListHost, {
				props: {
					...baseProps,
					tokens: [BTC_MAINNET_TOKEN, unfundedStock],
					renderNoResults: false,
					filterZeroBalance: true,
					filterCategoryTag: TokenCategoryTagValue.STOCK
				}
			});

			await expect(findByTestId(`${MODAL_TOKEN_LIST_ITEM_PREFIX}BTC`)).resolves.toBeInTheDocument();
			expect(getByTestId(TOKEN_CATEGORY_FILTER)).toHaveTextContent(
				get(i18n).tokens.text.asset_type_all_short
			);
		});
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
