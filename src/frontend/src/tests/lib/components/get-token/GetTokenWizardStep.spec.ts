import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import GetTokenWizardStep from '$lib/components/get-token/GetTokenWizardStep.svelte';
import * as tokensDerived from '$lib/derived/tokens.derived';
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

	it('renders correct title if exchange is not available', () => {
		vi.spyOn(tokensDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
			readable(balance)
		);

		const { getAllByText } = render(GetTokenWizardStep, {
			props,
			context: mockContext()
		});

		expect(
			getAllByText(
				replacePlaceholders(en.stake.text.get_tokens, {
					$token_symbol: ETHEREUM_TOKEN.symbol
				})
			)[0]
		).toBeInTheDocument();
	});

	it('renders correct title if balance is not available', () => {
		exchangeStore.set([{ ethereum: { usd: exchangeRate } }]);

		const { getAllByText } = render(GetTokenWizardStep, {
			props,
			context: mockContext()
		});

		expect(
			getAllByText(
				replacePlaceholders(en.stake.text.get_tokens, {
					$token_symbol: ETHEREUM_TOKEN.symbol
				})
			)[0]
		).toBeInTheDocument();
	});

	it('renders correct title if exchange and balance are available', () => {
		vi.spyOn(tokensDerived, 'enabledMainnetFungibleTokensUsdBalance', 'get').mockReturnValue(
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
});
