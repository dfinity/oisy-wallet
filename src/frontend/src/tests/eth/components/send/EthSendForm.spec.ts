import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SEND_TRANSACTION_PRIORITY_ENABLED } from '$env/send-transaction-priority.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthSendForm from '$eth/components/send/EthSendForm.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { ZERO } from '$lib/constants/app.constants';
import {
	ETH_FEE_PRIORITY,
	SEND_DESTINATION_SECTION,
	SEND_FEE_INFO,
	SEND_FORM_NEXT_BUTTON,
	SEND_INSUFFICIENT_FEE_INFO,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { EthFeePriority } from '$lib/enums/eth-fee-priority';
import { balancesStore } from '$lib/stores/balances.store';
import { SEND_CONTEXT_KEY, initSendContext } from '$lib/stores/send.store';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';

describe('EthSendForm', () => {
	const mockContext = new Map([]);
	mockContext.set(
		SEND_CONTEXT_KEY,
		initSendContext({
			token: ETHEREUM_TOKEN
		})
	);
	const feeStore = initEthFeeStore();
	feeStore.setFee({
		maxFeePerGas: 100n,
		maxPriorityFeePerGas: 5n,
		baseFeePerGas: 20n,
		gas: 21_000n
	});

	const feeContext = initEthFeeContext({
		feeStore,
		feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
		feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
		feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
		feeExchangeRateStore: writable(undefined)
	});

	// The priority row only renders once the network has offered tiers, so seed them: otherwise
	// the flag assertion below would pass for the wrong reason.
	feeContext.feePrioritiesStore.set({
		baseFeePerGas: 20n,
		perPriority: {
			[EthFeePriority.SLOW]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 1n },
			[EthFeePriority.STANDARD]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 5n },
			[EthFeePriority.FAST]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 20n }
		}
	});

	mockContext.set(ETH_FEE_CONTEXT_KEY, feeContext);

	const props = {
		destination: '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9',
		amount: '22000000',
		network: ETHEREUM_NETWORK,
		nativeEthereumToken: ETHEREUM_TOKEN,
		onBack: vi.fn(),
		onNext: vi.fn(),
		onTokensList: vi.fn(),
		cancel: mockSnippet
	};

	const amountSelector = `input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`;
	const toolbarSelector = 'div[data-tid="toolbar"]';

	it('should render all fields', () => {
		const { container, getByTestId, getByText, queryByTestId } = render(EthSendForm, {
			props,
			context: mockContext
		});

		const amount: HTMLInputElement | null = container.querySelector(amountSelector);

		expect(amount).not.toBeNull();

		expect(getByTestId(SEND_DESTINATION_SECTION)).toBeInTheDocument();

		// The label follows the feature flag: the estimate only replaces the ceiling where the
		// priority work is enabled.
		expect(
			getByText(
				SEND_TRANSACTION_PRIORITY_ENABLED
					? en.fee.text.estimated_fee_eth
					: // max_fee_eth contains HTML, so match the leading plain-text fragment only
						'Max fee'
			)
		).toBeInTheDocument();

		// The priority row follows the same flag, so beta and production keep today's form.
		expect(queryByTestId(ETH_FEE_PRIORITY)).toStrictEqual(
			SEND_TRANSACTION_PRIORITY_ENABLED ? expect.anything() : null
		);

		const toolbar: HTMLDivElement | null = container.querySelector(toolbarSelector);

		expect(toolbar).not.toBeNull();
	});

	describe('the fee box', () => {
		const setup = ({
			token,
			nativeEthereumBalance,
			tokenBalance
		}: {
			token: Token;
			nativeEthereumBalance: bigint;
			tokenBalance?: bigint;
		}) => {
			const context = new Map<symbol, unknown>();
			context.set(SEND_CONTEXT_KEY, initSendContext({ token }));

			const feeStore = initEthFeeStore();
			feeStore.setFee({
				maxFeePerGas: 100n,
				maxPriorityFeePerGas: 5n,
				baseFeePerGas: 20n,
				gas: 21_000n
			});
			context.set(
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
					feeExchangeRateStore: writable(undefined)
				})
			);

			balancesStore.set({
				id: ETHEREUM_TOKEN.id,
				data: { data: nativeEthereumBalance, certified: true }
			});

			if (nonNullish(tokenBalance)) {
				balancesStore.set({ id: token.id, data: { data: tokenBalance, certified: true } });
			}

			const rendered = render(EthSendForm, {
				props: { ...props, amount: undefined },
				context
			});

			const input: HTMLInputElement | null = rendered.container.querySelector(amountSelector);

			assertNonNullish(input);

			return { ...rendered, input };
		};

		it('never shows the old blue "fee paid in" box for an ERC-20 send', () => {
			const { queryByTestId } = setup({
				token: mockValidErc20Token,
				nativeEthereumBalance: 10_000_000n,
				tokenBalance: 100_00000000n
			});

			expect(queryByTestId(SEND_FEE_INFO)).not.toBeInTheDocument();
		});

		it('shows the orange fee box, and blocks Next, when ETH cannot cover an ERC-20 fee', async () => {
			const { input, queryByTestId, getByText, getByTestId } = setup({
				token: mockValidErc20Token,
				nativeEthereumBalance: ZERO,
				tokenBalance: 100_00000000n
			});

			await fireEvent.input(input, { target: { value: '1' } });

			await waitFor(() => {
				expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
			});

			expect(
				getByText(
					replacePlaceholders(en.send.assertion.not_enough_tokens_for_gas, {
						$symbol: ETHEREUM_TOKEN.symbol,
						$balance: formatToken({
							value: ZERO,
							unitName: ETHEREUM_TOKEN.decimals,
							displayDecimals: ETHEREUM_TOKEN.decimals
						})
					})
				)
			).toBeInTheDocument();

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		it('shows the orange fee box again after the amount is cleared and retyped', async () => {
			const { input, queryByTestId } = setup({
				token: mockValidErc20Token,
				nativeEthereumBalance: ZERO,
				tokenBalance: 100_00000000n
			});

			await fireEvent.input(input, { target: { value: '1' } });

			await waitFor(() => {
				expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
			});

			await fireEvent.input(input, { target: { value: '' } });

			await waitFor(() => {
				expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
			});

			// A different, still-insufficient amount: the box must be re-evaluated from scratch, not
			// left stuck at whatever the cleared field last resolved to.
			await fireEvent.input(input, { target: { value: '2' } });

			await waitFor(() => {
				expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).toBeInTheDocument();
			});
		});

		it('blocks Next without the orange fee box when an ERC-20 amount exceeds its own balance', async () => {
			const { input, queryByTestId, getByTestId } = setup({
				token: mockValidErc20Token,
				nativeEthereumBalance: 10_000_000n,
				tokenBalance: 1n
			});

			await fireEvent.input(input, { target: { value: '5' } });

			await waitFor(() => {
				expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
			});

			expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
		});

		it('does not show the orange fee box for a native ETH send short on gas', async () => {
			const { input, queryByTestId, getByTestId } = setup({
				token: ETHEREUM_TOKEN,
				nativeEthereumBalance: ZERO
			});

			await fireEvent.input(input, { target: { value: '1' } });

			await waitFor(() => {
				expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
			});

			expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
		});
	});

	// The amount step is fully remounted every time the wizard leaves and returns to it (e.g.
	// "Back" from Review), while the typed amount itself is preserved across that remount. A stale
	// default here would let "Next" be clicked once more before validation caught up - these mount
	// with an already-insufficient amount and assert "Next" is blocked immediately, with no input
	// event and no `waitFor`, which only passes if validation is not still racing an async check.
	describe('revalidating a (re)mounted step', () => {
		const setup = ({
			token,
			amount,
			nativeEthereumBalance,
			tokenBalance
		}: {
			token: Token;
			amount: string;
			nativeEthereumBalance: bigint;
			tokenBalance?: bigint;
		}) => {
			const context = new Map<symbol, unknown>();
			context.set(SEND_CONTEXT_KEY, initSendContext({ token }));

			const feeStore = initEthFeeStore();
			feeStore.setFee({
				maxFeePerGas: 100n,
				maxPriorityFeePerGas: 5n,
				baseFeePerGas: 20n,
				gas: 21_000n
			});
			context.set(
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
					feeExchangeRateStore: writable(undefined)
				})
			);

			balancesStore.set({
				id: ETHEREUM_TOKEN.id,
				data: { data: nativeEthereumBalance, certified: true }
			});

			if (nonNullish(tokenBalance)) {
				balancesStore.set({ id: token.id, data: { data: tokenBalance, certified: true } });
			}

			return render(EthSendForm, {
				props: { ...props, amount },
				context
			});
		};

		it('keeps Next blocked for an ERC-20 amount already over balance', () => {
			const { getByTestId } = setup({
				token: mockValidErc20Token,
				amount: '5',
				nativeEthereumBalance: 10_000_000n,
				tokenBalance: 1n
			});

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		it('keeps Next blocked for a native amount already short on gas', () => {
			const { getByTestId } = setup({
				token: ETHEREUM_TOKEN,
				amount: '1',
				nativeEthereumBalance: ZERO
			});

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});
	});

	// The gas fee arrives asynchronously (a network round trip), so it can still be unresolved the
	// instant this step (re)mounts - e.g. right after "Back" from Review, with the amount already
	// filled in from before. Reading an unresolved fee as "no issue" let "Next" through before the
	// check it depends on had actually settled - this is the async check itself, not a race around it.
	describe('gating while the gas fee has not resolved yet', () => {
		const setup = ({ token, tokenBalance }: { token: Token; tokenBalance?: bigint }) => {
			const context = new Map<symbol, unknown>();
			context.set(SEND_CONTEXT_KEY, initSendContext({ token }));

			// The fee store is created but `setFee` is never called: the gas fee has not arrived yet.
			const feeStore = initEthFeeStore();
			context.set(
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore,
					feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
					feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
					feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals),
					feeExchangeRateStore: writable(undefined)
				})
			);

			balancesStore.set({ id: ETHEREUM_TOKEN.id, data: { data: ZERO, certified: true } });

			if (nonNullish(tokenBalance)) {
				balancesStore.set({ id: token.id, data: { data: tokenBalance, certified: true } });
			}

			return render(EthSendForm, {
				props: { ...props, amount: '1' },
				context
			});
		};

		it('keeps Next blocked for an ERC-20 amount while the fee is still pending', () => {
			const { getByTestId } = setup({ token: mockValidErc20Token, tokenBalance: 100_00000000n });

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});

		it('does not show the orange fee box while the fee is still pending', () => {
			const { queryByTestId } = setup({ token: mockValidErc20Token, tokenBalance: 100_00000000n });

			// Nothing is confirmed insufficient yet, so no decoration is painted - only "Next" blocks.
			expect(queryByTestId(SEND_INSUFFICIENT_FEE_INFO)).not.toBeInTheDocument();
		});

		it('keeps Next blocked for a native amount while the fee is still pending', () => {
			const { getByTestId } = setup({ token: ETHEREUM_TOKEN });

			expect(getByTestId(SEND_FORM_NEXT_BUTTON)).toBeDisabled();
		});
	});
});
