import * as lendBorrowEnv from '$env/lend-borrow';
import ExchangeBalance from '$lib/components/exchange/ExchangeBalance.svelte';
import { AppPath, ROUTE_ID_GROUP_APP } from '$lib/constants/routes.constants';
import * as balancesDerived from '$lib/derived/balances.derived';
import * as currencyDerived from '$lib/derived/currency.derived';
import * as i18nDerived from '$lib/derived/i18n.derived';
import * as liquidiumDerived from '$lib/derived/liquidium.derived';
import * as networkTokensUiDerived from '$lib/derived/network-tokens-ui.derived';
import * as settingsDerived from '$lib/derived/settings.derived';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import * as currencyExchangeStore from '$lib/stores/currency-exchange.store';
import { HERO_CONTEXT_KEY, initHeroContext, type HeroContext } from '$lib/stores/hero.store';
import type { TokenUi } from '$lib/types/token-ui';
import * as formatUtils from '$lib/utils/format.utils';
import * as privacyUtils from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

const staticStore = <T>(v: T) => readable<T>(v);

const mkTokenUi = (overrides: Partial<TokenUi>): TokenUi => ({ ...mockValidToken, ...overrides });

describe('ExchangeBalance', () => {
	let mockHeroContext: HeroContext;

	const mockContext = (ctx: HeroContext) => new Map([[HERO_CONTEXT_KEY, ctx]]);

	const mockTokens: TokenUi[] = [
		mkTokenUi({ usdBalance: 100, stakeUsdBalance: 10, claimableStakeBalanceUsd: 5 }),
		mkTokenUi({ usdBalance: 200, stakeUsdBalance: 20, claimableStakeBalanceUsd: 0 })
	];

	const renderComponent = (props: { hideBalance?: boolean } = {}) =>
		render(ExchangeBalance, {
			props,
			context: mockContext(mockHeroContext)
		});

	beforeEach(() => {
		vi.restoreAllMocks();

		mockHeroContext = initHeroContext();

		mockPage.reset();
		mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Tokens}` });

		vi.spyOn(i18nDerived, 'currentLanguage', 'get').mockReturnValue(staticStore(Languages.ENGLISH));
		vi.spyOn(currencyDerived, 'currentCurrency', 'get').mockReturnValue(staticStore(Currency.USD));

		vi.spyOn(currencyExchangeStore, 'currencyExchangeStore', 'get').mockReturnValue({
			...staticStore({
				currency: Currency.USD,
				exchangeRateToUsd: 1,
				exchangeRate24hChangeMultiplier: 1
			}),
			setExchangeRate: vi.fn(),
			setExchangeRateCurrency: vi.fn(),
			setExchangeRate24hChangeMultiplier: vi.fn()
		});

		vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
			staticStore(mockTokens)
		);

		vi.spyOn(settingsDerived, 'showTokenCategoryFilter', 'get').mockReturnValue(staticStore(false));
		vi.spyOn(settingsDerived, 'tokenCategoryFilter', 'get').mockReturnValue(staticStore(undefined));
		vi.spyOn(settingsDerived, 'isPrivacyMode', 'get').mockReturnValue(staticStore(false));

		vi.spyOn(balancesDerived, 'allBalancesZero', 'get').mockReturnValue(staticStore(false));

		vi.spyOn(formatUtils, 'formatCurrency').mockImplementation(({ value }) => `$${value}.00`);
	});

	describe('when loaded', () => {
		beforeEach(() => {
			mockHeroContext.loading.set(false);
		});

		it('should render the formatted balance', () => {
			const { getByText } = renderComponent();

			expect(getByText('$335.00')).toBeInTheDocument();
		});

		it('should not render formatted balance when hideBalance is true', () => {
			const { queryByText } = renderComponent({ hideBalance: true });

			expect(queryByText('$335.00')).not.toBeInTheDocument();
		});

		it('should render "Your balance" label when balances are not all zero', () => {
			const { getByText } = renderComponent();

			expect(getByText(en.hero.text.available_balance)).toBeInTheDocument();
		});

		it('should render "Top up your wallet" label when all balances are zero', () => {
			vi.spyOn(balancesDerived, 'allBalancesZero', 'get').mockReturnValue(staticStore(true));

			const { getByText } = renderComponent();

			expect(getByText(en.hero.text.top_up)).toBeInTheDocument();
		});

		it('should render "hidden balance" message when hideBalance is true', () => {
			const { getByText } = renderComponent({ hideBalance: true });

			expect(getByText(en.hero.text.hidden_balance)).toBeInTheDocument();
		});
	});

	describe('when not loaded', () => {
		beforeEach(() => {
			mockHeroContext.loading.set(true);
		});

		it('should render a zero-value placeholder', () => {
			const { getByText } = renderComponent();

			expect(getByText('$0.00')).toBeInTheDocument();
		});

		it('should not render the zero placeholder when hideBalance is true', () => {
			const { queryByText } = renderComponent({ hideBalance: true });

			expect(queryByText('$0.00')).not.toBeInTheDocument();
		});
	});

	describe('token category filtering', () => {
		const tokensWithTags: TokenUi[] = [
			mkTokenUi({
				usdBalance: 50,
				stakeUsdBalance: 0,
				claimableStakeBalanceUsd: 0,
				tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }]
			}),
			mkTokenUi({
				usdBalance: 200,
				stakeUsdBalance: 0,
				claimableStakeBalanceUsd: 0,
				tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }]
			})
		];

		beforeEach(() => {
			mockHeroContext.loading.set(false);
		});

		it('should use all tokens when showTokenCategoryFilter is false', () => {
			vi.spyOn(settingsDerived, 'showTokenCategoryFilter', 'get').mockReturnValue(
				staticStore(false)
			);

			const { getByText } = renderComponent();

			expect(getByText('$335.00')).toBeInTheDocument();
		});

		it('should filter tokens by category when on tokens route and showTokenCategoryFilter is true', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Tokens}` });

			vi.spyOn(settingsDerived, 'showTokenCategoryFilter', 'get').mockReturnValue(
				staticStore(true)
			);
			vi.spyOn(settingsDerived, 'tokenCategoryFilter', 'get').mockReturnValue(
				staticStore(TokenCategoryTagValue.CRYPTO as TokenCategoryTagValue | undefined)
			);

			vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
				staticStore(tokensWithTags)
			);

			const { getByText } = renderComponent();

			expect(getByText('$50.00')).toBeInTheDocument();
		});

		it('should not filter tokens by category when not on tokens route even if showTokenCategoryFilter is true', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Transactions}` });

			vi.spyOn(settingsDerived, 'showTokenCategoryFilter', 'get').mockReturnValue(
				staticStore(true)
			);
			vi.spyOn(settingsDerived, 'tokenCategoryFilter', 'get').mockReturnValue(
				staticStore(TokenCategoryTagValue.CRYPTO as TokenCategoryTagValue | undefined)
			);

			vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
				staticStore(tokensWithTags)
			);

			const { getByText } = renderComponent();

			expect(getByText('$250.00')).toBeInTheDocument();
		});

		it('should use all tokens on non-tokens route when showTokenCategoryFilter is false', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Settings}` });

			vi.spyOn(settingsDerived, 'showTokenCategoryFilter', 'get').mockReturnValue(
				staticStore(false)
			);

			const { getByText } = renderComponent();

			expect(getByText('$335.00')).toBeInTheDocument();
		});

		it('should filter tokens on WalletConnect route since it is treated as tokens route', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.WalletConnect}` });

			vi.spyOn(settingsDerived, 'showTokenCategoryFilter', 'get').mockReturnValue(
				staticStore(true)
			);
			vi.spyOn(settingsDerived, 'tokenCategoryFilter', 'get').mockReturnValue(
				staticStore(TokenCategoryTagValue.STABLECOIN as TokenCategoryTagValue | undefined)
			);

			vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
				staticStore(tokensWithTags)
			);

			const { getByText } = renderComponent();

			expect(getByText('$200.00')).toBeInTheDocument();
		});

		it('should show all tokens on tokens route when filter is enabled but category is undefined', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Tokens}` });

			vi.spyOn(settingsDerived, 'showTokenCategoryFilter', 'get').mockReturnValue(
				staticStore(true)
			);
			vi.spyOn(settingsDerived, 'tokenCategoryFilter', 'get').mockReturnValue(
				staticStore(undefined)
			);

			vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
				staticStore(tokensWithTags)
			);

			const { getByText } = renderComponent();

			expect(getByText('$250.00')).toBeInTheDocument();
		});

		it('should filter by stablecoin category on tokens route', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Tokens}` });

			vi.spyOn(settingsDerived, 'showTokenCategoryFilter', 'get').mockReturnValue(
				staticStore(true)
			);
			vi.spyOn(settingsDerived, 'tokenCategoryFilter', 'get').mockReturnValue(
				staticStore(TokenCategoryTagValue.STABLECOIN as TokenCategoryTagValue | undefined)
			);

			vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
				staticStore(tokensWithTags)
			);

			const { getByText } = renderComponent();

			expect(getByText('$200.00')).toBeInTheDocument();
		});

		it('should not filter tokens on earning route even if filter and category are set', () => {
			mockPage.mockRoute({ id: `${ROUTE_ID_GROUP_APP}${AppPath.Earning}` });

			vi.spyOn(settingsDerived, 'showTokenCategoryFilter', 'get').mockReturnValue(
				staticStore(true)
			);
			vi.spyOn(settingsDerived, 'tokenCategoryFilter', 'get').mockReturnValue(
				staticStore(TokenCategoryTagValue.STABLECOIN as TokenCategoryTagValue | undefined)
			);

			vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
				staticStore(tokensWithTags)
			);

			const { getByText } = renderComponent();

			expect(getByText('$250.00')).toBeInTheDocument();
		});
	});

	describe('privacy mode toggle', () => {
		beforeEach(() => {
			mockHeroContext.loading.set(false);
		});

		it('should call setPrivacyMode on double-click', async () => {
			const setPrivacyModeSpy = vi.spyOn(privacyUtils, 'setPrivacyMode');

			const { container } = renderComponent();

			const toggleButton = container.querySelector('span[role="button"]');

			expect(toggleButton).not.toBeNull();

			assertNonNullish(toggleButton);

			await fireEvent.dblClick(toggleButton);

			expect(setPrivacyModeSpy).toHaveBeenCalledExactlyOnceWith({
				enabled: true,
				withToast: false,
				source: 'Hero - Double click on the ExchangeBalance'
			});
		});

		it('should toggle privacy mode off when already enabled', async () => {
			vi.spyOn(settingsDerived, 'isPrivacyMode', 'get').mockReturnValue(staticStore(true));

			const setPrivacyModeSpy = vi.spyOn(privacyUtils, 'setPrivacyMode');

			const { container } = renderComponent();

			const toggleButton = container.querySelector('span[role="button"]');

			expect(toggleButton).not.toBeNull();

			assertNonNullish(toggleButton);

			await fireEvent.dblClick(toggleButton);

			expect(setPrivacyModeSpy).toHaveBeenCalledExactlyOnceWith({
				enabled: false,
				withToast: false,
				source: 'Hero - Double click on the ExchangeBalance'
			});
		});
	});

	describe('balance calculation', () => {
		beforeEach(() => {
			mockHeroContext.loading.set(false);
		});

		it('should sum usdBalance and stakeUsdBalance including claimable rewards', () => {
			const tokens: TokenUi[] = [
				mkTokenUi({ usdBalance: 1000, stakeUsdBalance: 50, claimableStakeBalanceUsd: 25 })
			];

			vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
				staticStore(tokens)
			);

			const { getByText } = renderComponent();

			expect(getByText('$1075.00')).toBeInTheDocument();
		});

		it('should handle tokens with undefined balances', () => {
			const tokens: TokenUi[] = [
				mkTokenUi({
					usdBalance: undefined,
					stakeUsdBalance: undefined,
					claimableStakeBalanceUsd: undefined
				})
			];

			vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
				staticStore(tokens)
			);

			const { getByText } = renderComponent();

			expect(getByText('$0.00')).toBeInTheDocument();
		});

		it('should render zero when there are no tokens', () => {
			vi.spyOn(networkTokensUiDerived, 'enabledFungibleNetworkTokensUi', 'get').mockReturnValue(
				staticStore([])
			);

			const { getByText } = renderComponent();

			expect(getByText('$0.00')).toBeInTheDocument();
		});
	});

	describe('Liquidium net value', () => {
		beforeEach(() => {
			mockHeroContext.loading.set(false);
		});

		it('should add supplied-minus-borrowed net value to the total when enabled', () => {
			vi.spyOn(lendBorrowEnv, 'anyLendBorrowProviderEnabled', 'get').mockReturnValue(true);
			vi.spyOn(liquidiumDerived, 'liquidiumNetValueUsd', 'get').mockReturnValue(staticStore(500));

			const { getByText } = renderComponent();

			expect(getByText('$835.00')).toBeInTheDocument();
		});

		it('should deduct a negative net value (net debt) from the total when enabled', () => {
			vi.spyOn(lendBorrowEnv, 'anyLendBorrowProviderEnabled', 'get').mockReturnValue(true);
			vi.spyOn(liquidiumDerived, 'liquidiumNetValueUsd', 'get').mockReturnValue(staticStore(-100));

			const { getByText } = renderComponent();

			expect(getByText('$235.00')).toBeInTheDocument();
		});

		it('should ignore Liquidium net value when the feature is disabled', () => {
			vi.spyOn(lendBorrowEnv, 'anyLendBorrowProviderEnabled', 'get').mockReturnValue(false);
			vi.spyOn(liquidiumDerived, 'liquidiumNetValueUsd', 'get').mockReturnValue(staticStore(500));

			const { getByText } = renderComponent();

			expect(getByText('$335.00')).toBeInTheDocument();
		});
	});
});
