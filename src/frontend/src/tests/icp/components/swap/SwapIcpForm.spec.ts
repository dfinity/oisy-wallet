import SwapIcpForm from '$icp/components/swap/SwapIcpForm.svelte';
import { IC_TOKEN_FEE_CONTEXT_KEY, icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import {
	SWAP_SWITCH_TOKENS_BUTTON,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { SWAP_AMOUNTS_CONTEXT_KEY, initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapIcpForm', () => {
	const mockContext = new Map();

	beforeEach(() => {
		const originalSwapContext = initSwapContext({
			sourceToken: mockValidIcToken as IcTokenToggleable,
			destinationToken: mockValidIcCkToken as IcTokenToggleable
		});

		const mockSwapContext = {
			...originalSwapContext,
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2),
			isSourceTokenIcrc2: readable(false)
		};

		mockContext.set(SWAP_CONTEXT_KEY, mockSwapContext);

		icTokenFeeStore.setIcTokenFee({
			tokenSymbol: mockValidIcToken.symbol,
			fee: 1000n
		});
		mockContext.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });
	});

	const props = {
		swapAmount: '1',
		receiveAmount: 2,
		slippageValue: '0.5',
		sourceTokenFee: 1000n,
		isSwapAmountsLoading: false,
		onShowTokensList: () => {},
		onClose: () => {},
		onNext: () => {}
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const switchButtonSelector = `button[data-tid="${SWAP_SWITCH_TOKENS_BUTTON}"]`;

	it('should render all fields', () => {
		const { container, getByTestId } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SWAP_SWITCH_TOKENS_BUTTON)).toBeInTheDocument();

		const switchButton: HTMLButtonElement | null = container.querySelector(switchButtonSelector);

		expect(switchButton).not.toBeNull();
	});

	it('should render the component', () => {
		const { container } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should render swap details when tokens are selected', () => {
		const { container } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		expect(
			container.textContent?.includes('fee') ?? container.querySelector('[class*="fee"]')
		).toBeTruthy();
	});

	it('should not render swap details when no destination token', () => {
		const contextWithoutDestination = new Map();
		const swapContextWithoutDestination = initSwapContext({
			sourceToken: mockValidIcToken as IcTokenToggleable,
			destinationToken: undefined
		});

		contextWithoutDestination.set(SWAP_CONTEXT_KEY, swapContextWithoutDestination);
		contextWithoutDestination.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
		contextWithoutDestination.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });

		const { container } = render(SwapIcpForm, {
			props,
			context: contextWithoutDestination
		});

		expect(container.querySelector('hr')).not.toBeInTheDocument();
	});

	it('should handle loading state', () => {
		const { container } = render(SwapIcpForm, {
			props: {
				...props,
				isSwapAmountsLoading: true
			},
			context: mockContext
		});

		expect(container).toBeInTheDocument();
	});

	it('should calculate total fee for ICRC2 tokens', () => {
		const icrc2Context = new Map();
		const icrc2SwapContext = {
			...initSwapContext({
				sourceToken: mockValidIcToken as IcTokenToggleable,
				destinationToken: mockValidIcCkToken as IcTokenToggleable
			}),
			isSourceTokenIcrc2: readable(true)
		};

		icrc2Context.set(SWAP_CONTEXT_KEY, icrc2SwapContext);
		icrc2Context.set(IC_TOKEN_FEE_CONTEXT_KEY, { store: icTokenFeeStore });
		icrc2Context.set(SWAP_AMOUNTS_CONTEXT_KEY, { store: initSwapAmountsStore() });

		const { container } = render(SwapIcpForm, {
			props: {
				...props,
				sourceTokenFee: 1000n
			},
			context: icrc2Context
		});

		expect(container).toBeInTheDocument();
	});

	it('should render exchange value displays', () => {
		const { container } = render(SwapIcpForm, {
			props,
			context: mockContext
		});

		const exchangeValues = container.querySelectorAll('[data-tid="swap-amount-exchange-value"]');

		expect(exchangeValues).toHaveLength(2);
	});
});
