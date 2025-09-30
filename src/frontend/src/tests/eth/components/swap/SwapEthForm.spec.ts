import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SwapEthForm from '$eth/components/swap/SwapEthForm.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import type { Erc20Token } from '$eth/types/erc20';
import {
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { render } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';

describe('SwapFormEth', () => {
	const mockContext = new Map();

	beforeEach(() => {
		const originalSwapContext = initSwapContext({
			sourceToken: mockValidErc20Token,
			destinationToken: ETHEREUM_TOKEN as Erc20Token
		});

		const mockSwapContext = {
			...originalSwapContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2)
		};

		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);

		mockContext.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore: initEthFeeStore(),
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });
	});

	const props = {
		swapAmount: '1',
		receiveAmount: 2,
		slippageValue: '0.5',
		nativeEthereumToken: ETHEREUM_TOKEN,
		isSwapAmountsLoading: false,
		onShowTokensList: () => {},
		onClose: () => {},
		onNext: () => {}
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const switchButtonSelector = `button[data-tid="${SWAP_SWITCH_TOKENS_BUTTON}"]`;

	it('should render all fields', () => {
		const { container, getByTestId, getByText } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();

		expect(getByText('Total fee')).toBeInTheDocument();

		const switchButton: HTMLButtonElement | null = container.querySelector(switchButtonSelector);

		expect(switchButton).not.toBeNull();
	});

	it('should render the component', () => {
		const { container } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should render swap details when tokens are selected', () => {
		const { getByText } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		expect(getByText('Total fee')).toBeInTheDocument();
	});

	it('should not render swap details when no destination token', () => {
		const contextWithoutDestination = new Map();
		const swapContextWithoutDestination = initSwapContext({
			sourceToken: mockValidErc20Token,
			destinationToken: undefined
		});

		contextWithoutDestination.set(SWAP_CONTEXT_KEY, swapContextWithoutDestination);
		contextWithoutDestination.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore: initEthFeeStore(),
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);
		contextWithoutDestination.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });

		const { queryByText } = render(SwapEthForm, {
			props,
			context: contextWithoutDestination
		});

		expect(queryByText('Total fee')).not.toBeInTheDocument();
	});

	it('should handle loading state', () => {
		const { container } = render(SwapEthForm, {
			props: {
				...props,
				isSwapAmountsLoading: true
			},
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should render token selection buttons', () => {
		const { container } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		const tokenButtons = container.querySelectorAll('button svg');

		expect(tokenButtons.length).toBeGreaterThanOrEqual(2);
	});

	it('should render exchange value displays', () => {
		const { container } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		const exchangeValues = container.querySelectorAll('[data-tid="swap-amount-exchange-value"]');

		expect(exchangeValues).toHaveLength(2);
	});

	it('should render action buttons', () => {
		const { getByText } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		expect(getByText('Cancel')).toBeInTheDocument();
		expect(getByText('Review swap')).toBeInTheDocument();
	});

	it('should show fee info message', () => {
		const { container, getByText } = render(SwapEthForm, {
			props,
			context: mockContext
		});

		expect(container.querySelector('[data-tid="swap-fee-info"]')).toBeInTheDocument();
		expect(getByText(/Fee will be paid in ETH/)).toBeInTheDocument();
	});
});
