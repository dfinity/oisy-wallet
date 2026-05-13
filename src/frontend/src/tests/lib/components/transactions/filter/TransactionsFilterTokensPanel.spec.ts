import TransactionsFilterTokensPanel from '$lib/components/transactions/filter/TransactionsFilterTokensPanel.svelte';
import * as networkTokensDerived from '$lib/derived/network-tokens.derived';
import { PLAUSIBLE_EVENT_EVENTS_KEYS, PLAUSIBLE_EVENT_FILTER_ACTIONS } from '$lib/enums/plausible';
import * as analyticsServices from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { transactionsFilterTokenKey } from '$lib/utils/transactions-filter.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

const mockEnabledFungibleNetworkTokens = (tokens: Token[]) => {
	vi.spyOn(networkTokensDerived.enabledFungibleNetworkTokens, 'subscribe').mockImplementation(
		(fn) => {
			fn(tokens);
			return () => {};
		}
	);
};

const buildToken = ({
	id,
	name,
	symbol,
	networkName
}: {
	id: string;
	name: string;
	symbol: string;
	networkName?: string;
}): Token => ({
	...mockValidIcToken,
	id: parseTokenId(id),
	name,
	symbol,
	network:
		networkName === undefined
			? mockValidIcToken.network
			: { ...mockValidIcToken.network, name: networkName }
});

const tokenInputId = (token: Token): string =>
	`transactions-filter-token-${(transactionsFilterTokenKey(token) ?? '').replace(/[^A-Za-z0-9_-]/g, '-')}`;

describe('TransactionsFilterTokensPanel', () => {
	const tokenAlpha = buildToken({ id: 'AlphaTokenId', name: 'Alpha', symbol: 'ALP' });
	const tokenBeta = buildToken({ id: 'BetaTokenId', name: 'Beta', symbol: 'BTA' });
	const tokenGamma = buildToken({ id: 'GammaTokenId', name: 'Gamma', symbol: 'GMA' });

	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		transactionsFilterStore.clear();
		mockEnabledFungibleNetworkTokens([tokenBeta, tokenAlpha, tokenGamma]);
	});

	it('renders one row per fungible token, alphabetically sorted by symbol', () => {
		const { container } = render(TransactionsFilterTokensPanel);

		const symbols = Array.from(container.querySelectorAll('li span.font-medium')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(symbols).toEqual(['ALP', 'BTA', 'GMA']);
	});

	it('sorts by symbol even when the alphabetical order of names disagrees', () => {
		// Names are deliberately reverse-ordered vs. symbols so that a
		// regression to name-based sorting would flip the rendered order.
		const tokenZebraAaa = buildToken({ id: 'ZebraTokenId', name: 'Zebra', symbol: 'AAA' });
		const tokenMangoMmm = buildToken({ id: 'MangoTokenId', name: 'Mango', symbol: 'MMM' });
		const tokenAlphaZzz = buildToken({ id: 'AlphaZzzTokenId', name: 'Alpha', symbol: 'ZZZ' });
		mockEnabledFungibleNetworkTokens([tokenAlphaZzz, tokenMangoMmm, tokenZebraAaa]);

		const { container } = render(TransactionsFilterTokensPanel);

		const symbols = Array.from(container.querySelectorAll('li span.font-medium')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(symbols).toEqual(['AAA', 'MMM', 'ZZZ']);
	});

	it('sorts symbols case-insensitively', () => {
		const tokenLowerB = buildToken({ id: 'LowerBTokenId', name: 'Lower B', symbol: 'btc' });
		const tokenUpperA = buildToken({ id: 'UpperATokenId', name: 'Upper A', symbol: 'ETH' });
		mockEnabledFungibleNetworkTokens([tokenLowerB, tokenUpperA]);

		const { container } = render(TransactionsFilterTokensPanel);

		const symbols = Array.from(container.querySelectorAll('li span.font-medium')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(symbols).toEqual(['btc', 'ETH']);
	});

	it('breaks symbol ties by network name (case-insensitive)', () => {
		// Same symbol on three networks; tiebreaker should order them by
		// network name, regardless of the input order.
		const tokenUsdcPolygon = buildToken({
			id: 'UsdcPolygonTokenId',
			name: 'USDC',
			symbol: 'USDC',
			networkName: 'Polygon'
		});
		const tokenUsdcEthereum = buildToken({
			id: 'UsdcEthereumTokenId',
			name: 'USDC',
			symbol: 'USDC',
			networkName: 'ethereum'
		});
		const tokenUsdcBase = buildToken({
			id: 'UsdcBaseTokenId',
			name: 'USDC',
			symbol: 'USDC',
			networkName: 'Base'
		});
		mockEnabledFungibleNetworkTokens([tokenUsdcPolygon, tokenUsdcEthereum, tokenUsdcBase]);

		const { container } = render(TransactionsFilterTokensPanel);

		const networkNames = Array.from(container.querySelectorAll('li span.text-tertiary')).map(
			(el) => el.textContent?.trim() ?? ''
		);

		expect(networkNames).toEqual([
			replacePlaceholders(get(i18n).tokens.text.on_network, { $network: 'Base' }).trim(),
			replacePlaceholders(get(i18n).tokens.text.on_network, { $network: 'ethereum' }).trim(),
			replacePlaceholders(get(i18n).tokens.text.on_network, { $network: 'Polygon' }).trim()
		]);
	});

	it('reflects the store as the checked state', () => {
		const alphaKey = transactionsFilterTokenKey(tokenAlpha);
		assertNonNullish(alphaKey);
		transactionsFilterStore.toggleTokenId(alphaKey);

		const { container } = render(TransactionsFilterTokensPanel);

		const alphaInput = container.querySelector<HTMLInputElement>(
			`input[id="${tokenInputId(tokenAlpha)}"]`
		);
		const betaInput = container.querySelector<HTMLInputElement>(
			`input[id="${tokenInputId(tokenBeta)}"]`
		);

		expect(alphaInput?.checked).toBeTruthy();
		expect(betaInput?.checked).toBeFalsy();
	});

	it('toggles the corresponding token id in the store when a checkbox changes', async () => {
		const { container } = render(TransactionsFilterTokensPanel);

		const input = container.querySelector<HTMLInputElement>(
			`input[id="${tokenInputId(tokenAlpha)}"]`
		);

		expect(input).not.toBeNull();

		await fireEvent.click(input as HTMLInputElement);

		const expectedAlphaKey = transactionsFilterTokenKey(tokenAlpha);
		assertNonNullish(expectedAlphaKey);

		expect(get(transactionsFilterStore).tokenIds).toEqual([expectedAlphaKey]);
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
		mockEnabledFungibleNetworkTokens(tokens);

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
		mockEnabledFungibleNetworkTokens(tokens);

		const { container, getByPlaceholderText } = render(TransactionsFilterTokensPanel);

		const search = getByPlaceholderText(get(i18n).transaction.filter.search_tokens_placeholder);
		await fireEvent.input(search, { target: { value: 'Token' } });

		expect(container.querySelectorAll('li')).toHaveLength(60);
	});

	it('tracks an activity filter event with action=add when a token is selected', async () => {
		const trackSpy = vi
			.spyOn(analyticsServices, 'trackActivityFilter')
			.mockImplementation(() => {});

		const { container } = render(TransactionsFilterTokensPanel);

		const input = container.querySelector<HTMLInputElement>(
			`input[id="${tokenInputId(tokenAlpha)}"]`
		);

		await fireEvent.click(input as HTMLInputElement);

		const expectedKey = transactionsFilterTokenKey(tokenAlpha);
		assertNonNullish(expectedKey);

		expect(trackSpy).toHaveBeenCalledWith({
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.TOKEN,
			value: expectedKey,
			action: PLAUSIBLE_EVENT_FILTER_ACTIONS.ADD
		});
	});

	it('tracks an activity filter event with action=remove when a token is unselected', async () => {
		const expectedKey = transactionsFilterTokenKey(tokenAlpha);
		assertNonNullish(expectedKey);
		transactionsFilterStore.toggleTokenId(expectedKey);

		const trackSpy = vi
			.spyOn(analyticsServices, 'trackActivityFilter')
			.mockImplementation(() => {});

		const { container } = render(TransactionsFilterTokensPanel);

		const input = container.querySelector<HTMLInputElement>(
			`input[id="${tokenInputId(tokenAlpha)}"]`
		);

		await fireEvent.click(input as HTMLInputElement);

		expect(trackSpy).toHaveBeenCalledWith({
			key: PLAUSIBLE_EVENT_EVENTS_KEYS.TOKEN,
			value: expectedKey,
			action: PLAUSIBLE_EVENT_FILTER_ACTIONS.REMOVE
		});
	});
});
