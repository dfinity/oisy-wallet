import TransactionsFilterTokensPanel from '$lib/components/transactions/filter/TransactionsFilterTokensPanel.svelte';
import * as allTokensDerived from '$lib/derived/all-tokens.derived';
import { i18n } from '$lib/stores/i18n.store';
import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

const mockAllFungibleTokens = (tokens: Token[]) => {
	vi.spyOn(allTokensDerived.allFungibleTokens, 'subscribe').mockImplementation((fn) => {
		fn(tokens);
		return () => {};
	});
};

const buildToken = ({ id, name, symbol }: { id: string; name: string; symbol: string }): Token => ({
	...mockValidIcToken,
	id: parseTokenId(id),
	name,
	symbol
});

describe('TransactionsFilterTokensPanel', () => {
	const tokenAlpha = buildToken({ id: 'AlphaTokenId', name: 'Alpha', symbol: 'ALP' });
	const tokenBeta = buildToken({ id: 'BetaTokenId', name: 'Beta', symbol: 'BTA' });
	const tokenGamma = buildToken({ id: 'GammaTokenId', name: 'Gamma', symbol: 'GMA' });

	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		transactionsFilterStore.clear();
		mockAllFungibleTokens([tokenBeta, tokenAlpha, tokenGamma]);
	});

	it('renders one row per fungible token, alphabetically sorted by name', () => {
		const { container } = render(TransactionsFilterTokensPanel);

		const symbols = Array.from(container.querySelectorAll('li span.font-medium')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(symbols).toEqual(['ALP', 'BTA', 'GMA']);
	});

	it('reflects the store as the checked state', () => {
		transactionsFilterStore.toggleTokenId('AlphaTokenId');

		const { container } = render(TransactionsFilterTokensPanel);

		const alphaInput = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-token-AlphaTokenId"]'
		);
		const betaInput = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-token-BetaTokenId"]'
		);

		expect(alphaInput?.checked).toBeTruthy();
		expect(betaInput?.checked).toBeFalsy();
	});

	it('toggles the corresponding token id in the store when a checkbox changes', async () => {
		const { container } = render(TransactionsFilterTokensPanel);

		const input = container.querySelector<HTMLInputElement>(
			'input[id="transactions-filter-token-AlphaTokenId"]'
		);

		expect(input).not.toBeNull();

		await fireEvent.click(input as HTMLInputElement);

		expect(get(transactionsFilterStore).tokenIds).toEqual(['AlphaTokenId']);
	});

	it('filters the list by token name using the search input (case-insensitive)', async () => {
		const { container, getByPlaceholderText } = render(TransactionsFilterTokensPanel);

		const search = getByPlaceholderText(get(i18n).transaction.filter.search_tokens_placeholder);
		await fireEvent.input(search, { target: { value: 'gam' } });

		const symbols = Array.from(container.querySelectorAll('li span.font-medium')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(symbols).toEqual(['GMA']);
	});

	it('filters the list by token symbol using the search input', async () => {
		const { container, getByPlaceholderText } = render(TransactionsFilterTokensPanel);

		const search = getByPlaceholderText(get(i18n).transaction.filter.search_tokens_placeholder);
		await fireEvent.input(search, { target: { value: 'BTA' } });

		const symbols = Array.from(container.querySelectorAll('li span.font-medium')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(symbols).toEqual(['BTA']);
	});

	it('caps the visible list to 50 rows when over the limit and renders the showing-partial hint', () => {
		const tokens: Token[] = Array.from({ length: 60 }, (_, i) =>
			buildToken({
				id: `Token${i.toString().padStart(3, '0')}Id`,
				name: `Token ${i.toString().padStart(3, '0')}`,
				symbol: `T${i.toString().padStart(3, '0')}`
			})
		);
		mockAllFungibleTokens(tokens);

		const { container, getByText } = render(TransactionsFilterTokensPanel);

		expect(container.querySelectorAll('li')).toHaveLength(50);

		const hint = replacePlaceholders(get(i18n).transaction.filter.showing_partial, {
			$shown: '50',
			$total: '60'
		});

		expect(getByText(hint)).toBeInTheDocument();
	});

	it('bypasses the cap when the search input has any value', async () => {
		const tokens: Token[] = Array.from({ length: 60 }, (_, i) =>
			buildToken({
				id: `Token${i.toString().padStart(3, '0')}Id`,
				name: `Token ${i.toString().padStart(3, '0')}`,
				symbol: `T${i.toString().padStart(3, '0')}`
			})
		);
		mockAllFungibleTokens(tokens);

		const { container, getByPlaceholderText } = render(TransactionsFilterTokensPanel);

		const search = getByPlaceholderText(get(i18n).transaction.filter.search_tokens_placeholder);
		await fireEvent.input(search, { target: { value: 'Token' } });

		expect(container.querySelectorAll('li')).toHaveLength(60);
	});
});
