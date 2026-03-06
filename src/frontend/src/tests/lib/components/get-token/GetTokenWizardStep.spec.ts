import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import GetTokenWizardStep from '$lib/components/get-token/GetTokenWizardStep.svelte';
import * as tokensUiDerived from '$lib/derived/tokens-ui.derived';
import { exchangeStore } from '$lib/stores/exchange.store';
import { initSwapContext, SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('GetTokenWizardStep', () => {
	const props = {
		token: ETHEREUM_TOKEN,
		currentApy: 10,
		onGoToStep: () => {},
		onClose: () => {}
	};
	const balance = 1000;
	const exchangeRate = 5;

	const mockContext = () => {
		const mockContext = new Map();

		mockContext.set(
			SWAP_CONTEXT_KEY,
			initSwapContext({
				destinationToken: ICP_TOKEN as IcTokenToggleable
			})
		);

		return mockContext;
	};

	beforeEach(() => {
		vi.resetAllMocks();
		exchangeStore.reset();
	});

	it('does not render amount title if exchange is not available', () => {
		vi.spyOn(tokensUiDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			readable(balance)
		);

		const { queryByText } = render(GetTokenWizardStep, {
			props,
			context: mockContext()
		});

		expect(
			queryByText(
				replacePlaceholders(en.stake.text.get_tokens_with_amount, {
					$token_symbol: ETHEREUM_TOKEN.symbol,
					$amount: `${balance / exchangeRate}`
				})
			)
		).not.toBeInTheDocument();
	});

	it('does not render amount title if balance is not available', () => {
		exchangeStore.set([{ ethereum: { usd: exchangeRate } }]);

		const { queryByText } = render(GetTokenWizardStep, {
			props,
			context: mockContext()
		});

		expect(
			queryByText(
				replacePlaceholders(en.stake.text.get_tokens_with_amount, {
					$token_symbol: ETHEREUM_TOKEN.symbol,
					$amount: `${balance / exchangeRate}`
				})
			)
		).not.toBeInTheDocument();
	});

	it('renders correct title if exchange and balance are available', () => {
		vi.spyOn(tokensUiDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			readable(balance)
		);
		exchangeStore.set([{ ethereum: { usd: exchangeRate } }]);

		const { getByText } = render(GetTokenWizardStep, {
			props,
			context: mockContext()
		});

		expect(
			getByText(
				replacePlaceholders(en.stake.text.get_tokens_with_amount, {
					$token_symbol: ETHEREUM_TOKEN.symbol,
					$amount: `${balance / exchangeRate}`
				})
			)
		).toBeInTheDocument();
	});

	it('uses availableBalance prop instead of derived balance when provided', () => {
		const availableBalance = 500;
		exchangeStore.set([{ ethereum: { usd: exchangeRate } }]);

		const { getByText } = render(GetTokenWizardStep, {
			props: {
				...props,
				availableBalance
			},
			context: mockContext()
		});

		expect(
			getByText(
				replacePlaceholders(en.stake.text.get_tokens_with_amount, {
					$token_symbol: ETHEREUM_TOKEN.symbol,
					$amount: `${Math.ceil(availableBalance / exchangeRate)}`
				})
			)
		).toBeInTheDocument();
	});

	it('renders "< 1" when potential token balance is less than 1', () => {
		exchangeStore.set([{ ethereum: { usd: exchangeRate } }]);

		const { getByText } = render(GetTokenWizardStep, {
			props: {
				...props,
				availableBalance: 1
			},
			context: mockContext()
		});

		expect(
			getByText(
				replacePlaceholders(en.stake.text.get_tokens_with_amount, {
					$token_symbol: ETHEREUM_TOKEN.symbol,
					$amount: '< 1'
				})
			)
		).toBeInTheDocument();
	});
});
