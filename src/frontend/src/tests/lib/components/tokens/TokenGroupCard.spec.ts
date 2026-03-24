import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import TokenGroupCard from '$lib/components/tokens/TokenGroupCard.svelte';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import { hideTokenCategoryFilterStore, tokenCategoryFilterStore } from '$lib/stores/settings.store';
import { tokenListStore } from '$lib/stores/token-list.store';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiGroup } from '$lib/types/token-ui-group';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('TokenGroupCard', () => {
	const mkTokenUi = ({
		tags,
		name,
		symbol,
		network,
		usdBalance
	}: {
		tags: TokenUi['tags'];
		name: string;
		symbol: string;
		network?: TokenUi['network'];
		usdBalance?: number;
	}): TokenUi =>
		({
			...mockValidToken,
			id: parseTokenId(symbol),
			tags,
			name,
			symbol,
			network: network ?? ICP_NETWORK,
			usdBalance: usdBalance ?? 0
		}) as TokenUi;

	const cryptoTag = [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }];
	const stablecoinTag = [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }];

	const cryptoTokenA = mkTokenUi({
		tags: cryptoTag,
		name: 'Crypto A',
		symbol: 'CRYA',
		network: ICP_NETWORK
	});
	const cryptoTokenB = mkTokenUi({
		tags: cryptoTag,
		name: 'Crypto B',
		symbol: 'CRYB',
		network: ETHEREUM_NETWORK
	});
	const stableToken = mkTokenUi({
		tags: stablecoinTag,
		name: 'Stable C',
		symbol: 'STBC',
		network: ICP_NETWORK
	});

	const groupId = Symbol('test-group');

	const tokenGroup: TokenUiGroup = {
		id: groupId,
		decimals: 8,
		groupData: { id: groupId, symbol: 'GRP', name: 'TestGroup' },
		tokens: [cryptoTokenA, cryptoTokenB, stableToken],
		balance: 100n,
		usdBalance: 300
	};

	beforeEach(() => {
		hideTokenCategoryFilterStore.reset({ key: 'hide-token-category-filter' });
		tokenCategoryFilterStore.reset({ key: 'token-category-filter' });
		tokenListStore.set({ filter: '' });
	});

	const getTokenCountBadge = (container: HTMLElement): HTMLElement | null =>
		container.querySelector('[data-tid^="token-count"]');

	it('should show total token count when no category filter is active', () => {
		const { container } = render(TokenGroupCard, { props: { tokenGroup } });

		const badge = getTokenCountBadge(container);

		expect(badge).toBeInTheDocument();
		expect(badge?.textContent?.trim()).toBe('3');
	});

	it('should show filtered token count when category filter is active', () => {
		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.CRYPTO }
		});

		const { container } = render(TokenGroupCard, { props: { tokenGroup } });

		const badge = getTokenCountBadge(container);

		expect(badge).toBeInTheDocument();
		expect(badge?.textContent?.trim()).toBe('2');
	});

	it('should show count of 1 when only one token matches the category', () => {
		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.STABLECOIN }
		});

		const { container } = render(TokenGroupCard, { props: { tokenGroup } });

		const badge = getTokenCountBadge(container);

		expect(badge?.textContent?.trim()).toBe('1');
	});

	it('should show full count when category filter feature is hidden', () => {
		hideTokenCategoryFilterStore.set({
			key: 'hide-token-category-filter',
			value: { enabled: true }
		});
		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.CRYPTO }
		});

		const { container } = render(TokenGroupCard, { props: { tokenGroup } });

		const badge = getTokenCountBadge(container);

		expect(badge?.textContent?.trim()).toBe('3');
	});

	it('should combine category and text filters for the token count', () => {
		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.CRYPTO }
		});
		tokenListStore.set({ filter: 'Crypto A' });

		const { container } = render(TokenGroupCard, { props: { tokenGroup } });

		const badge = getTokenCountBadge(container);

		expect(badge?.textContent?.trim()).toBe('1');
	});

	it('should show no badge when count would be zero after category filtering', () => {
		const allStableGroup: TokenUiGroup = {
			...tokenGroup,
			tokens: [stableToken]
		};

		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.CRYPTO }
		});

		const { container } = render(TokenGroupCard, { props: { tokenGroup: allStableGroup } });

		const badge = getTokenCountBadge(container);

		expect(badge).toBeNull();
	});

	it('should only render matching tokens when expanded with category filter active', async () => {
		tokenCategoryFilterStore.set({
			key: 'token-category-filter',
			value: { value: TokenCategoryTagValue.CRYPTO }
		});

		const { container } = render(TokenGroupCard, { props: { tokenGroup } });

		const header = container.querySelector('[data-tid^="token-group"]');

		expect(header).not.toBeNull();

		assertNonNullish(header);

		await fireEvent.click(header);

		const cryptoCardA = container.querySelector('[data-tid="token-card-CRYA-ICP"]');
		const cryptoCardB = container.querySelector('[data-tid="token-card-CRYB-ETH"]');
		const stableCard = container.querySelector('[data-tid="token-card-STBC-ICP"]');

		expect(cryptoCardA).toBeInTheDocument();
		expect(cryptoCardB).toBeInTheDocument();
		expect(stableCard).not.toBeInTheDocument();
	});

	it('should render all tokens when expanded without category filter', async () => {
		const { container } = render(TokenGroupCard, { props: { tokenGroup } });

		const header = container.querySelector('[data-tid^="token-group"]');

		expect(header).not.toBeNull();

		assertNonNullish(header);

		await fireEvent.click(header);

		const cryptoCardA = container.querySelector('[data-tid="token-card-CRYA-ICP"]');
		const cryptoCardB = container.querySelector('[data-tid="token-card-CRYB-ETH"]');
		const stableCard = container.querySelector('[data-tid="token-card-STBC-ICP"]');

		expect(cryptoCardA).toBeInTheDocument();
		expect(cryptoCardB).toBeInTheDocument();
		expect(stableCard).toBeInTheDocument();
	});
});
