import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import SwapEthForm from '$eth/components/swap/SwapEthForm.svelte';
import { ETH_FEE_CONTEXT_KEY, initEthFeeContext, initEthFeeStore } from '$eth/stores/eth-fee.store';
import { ZERO } from '$lib/constants/app.constants';
import {
	MAX_BUTTON,
	SWAP_INSUFFICIENT_FEE_INFO,
	TOKEN_INPUT_CURRENCY_TOKEN
} from '$lib/constants/test-ids.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY, initSwapContext } from '$lib/stores/swap.store';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { tick, type ComponentProps } from 'svelte';
import { readable, writable } from 'svelte/store';

// The network's coin pays the gas. When it cannot, no amount fixes that: the box below the fees
// says so and Review is held, while the pay field stays undecorated, as on Send. The field turns red
// only for an amount over what can be swapped. Kept apart from `SwapEthForm.spec.ts`, which stubs
// the amount parsing these checks depend on.
describe('SwapEthForm gas', () => {
	// A plain transfer at 1 gwei: the ceiling the form checks, and the tip alone, far below it.
	const gas = 21_000n;
	const ceiling = gas * 1_000_000_000n;
	const tip = gas;

	const mockContext = new Map();

	const withContext = ({
		sourceToken,
		destinationToken,
		offer = true
	}: {
		sourceToken: Token;
		destinationToken: Token;
		offer?: boolean;
	}) => {
		mockContext.set(SWAP_CONTEXT_KEY, {
			...initSwapContext({ sourceToken, destinationToken }),
			sourceTokenExchangeRate: readable(10),
			destinationTokenExchangeRate: readable(2)
		});

		const feeStore = initEthFeeStore();
		feeStore.setFee({ gas, maxFeePerGas: 1_000_000_000n, maxPriorityFeePerGas: 1n });

		mockContext.set(
			ETH_FEE_CONTEXT_KEY,
			initEthFeeContext({
				feeStore,
				feeSymbolStore: writable(ETHEREUM_TOKEN.symbol),
				feeTokenIdStore: writable(ETHEREUM_TOKEN.id),
				feeDecimalsStore: writable(ETHEREUM_TOKEN.decimals)
			})
		);

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, {
			store: writable(
				offer
					? { selectedProvider: { provider: 'Velora', receiveAmount: 1n }, swaps: [] }
					: undefined
			)
		});
	};

	const setBalance = ({ token, balance }: { token: Token; balance: bigint }) =>
		balancesStore.set({ id: token.id, data: { data: balance, certified: false } });

	const toAmount = ({ token, value }: { token: Token; value: bigint }) =>
		formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals });

	const boxText = (ethBalance: bigint) =>
		replacePlaceholders(en.send.assertion.not_enough_tokens_for_gas, {
			$symbol: ETHEREUM_TOKEN.symbol,
			$balance: toAmount({ token: ETHEREUM_TOKEN, value: ethBalance })
		});

	const props = {
		receiveAmount: 2,
		slippageValue: '0.5',
		nativeEthereumToken: ETHEREUM_TOKEN,
		isSwapAmountsLoading: false,
		isApproveNeeded: false,
		isGasless: false,
		onShowTokensList: () => {},
		onShowProviderList: () => {},
		onClose: () => {},
		onNext: () => {}
	};

	const renderForm = async (
		overrides: Partial<ComponentProps<typeof SwapEthForm>> & { swapAmount: string }
	) => {
		const result = render(SwapEthForm, { props: { ...props, ...overrides }, context: mockContext });

		await tick();

		const payField = result.container
			.querySelector(`input[data-tid="${TOKEN_INPUT_CURRENCY_TOKEN}"]`)
			?.closest('.token-input-currency');

		return {
			box: () => result.queryByTestId(SWAP_INSUFFICIENT_FEE_INFO),
			review: () => result.getByRole('button', { name: en.swap.text.review_button }),
			payFieldDecorated: () => payField?.classList.contains('text-error-primary'),
			maxDecorated: () => result.getByTestId(MAX_BUTTON).classList.contains('text-error-primary')
		};
	};

	afterEach(() => {
		balancesStore.reset(ETHEREUM_TOKEN.id);
		balancesStore.reset(mockValidErc20Token.id);
		mockContext.clear();
	});

	describe('an ERC-20 swap', () => {
		// 100 tokens at the mock's 8 decimals.
		const erc20Balance = 100_00000000n;

		beforeEach(() => {
			withContext({ sourceToken: mockValidErc20Token, destinationToken: ETHEREUM_TOKEN });
			setBalance({ token: mockValidErc20Token, balance: erc20Balance });
		});

		it('reports ETH short of the gas in the box, leaving the pay field undecorated', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance: ceiling - 1n });

			const { box, review, payFieldDecorated, maxDecorated } = await renderForm({
				swapAmount: '1'
			});

			expect(box()).toHaveTextContent(boxText(ceiling - 1n));
			expect(review()).toBeDisabled();
			expect(payFieldDecorated()).toBeFalsy();
			expect(maxDecorated()).toBeFalsy();
		});

		it('lets Review through once ETH covers the gas', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance: ceiling });

			const { box, review, payFieldDecorated } = await renderForm({ swapAmount: '1' });

			expect(box()).not.toBeInTheDocument();
			expect(review()).toBeEnabled();
			expect(payFieldDecorated()).toBeFalsy();
		});

		it('counts the approval in the gas', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance: ceiling });

			const { box, review } = await renderForm({ swapAmount: '1', isApproveNeeded: true });

			expect(box()).toHaveTextContent(boxText(ceiling));
			expect(review()).toBeDisabled();
		});

		it("checks LI.FI's own fee", async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance: ceiling });

			const { box, review, payFieldDecorated } = await renderForm({
				swapAmount: '1',
				isLifi: true,
				lifiFee: ceiling + 1n
			});

			expect(box()).toHaveTextContent(boxText(ceiling));
			expect(review()).toBeDisabled();
			expect(payFieldDecorated()).toBeFalsy();
		});

		it('decorates the pay field for an amount over the token balance, without the box', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance: ceiling });

			const { box, review, payFieldDecorated, maxDecorated } = await renderForm({
				swapAmount: '150'
			});

			expect(box()).not.toBeInTheDocument();
			expect(review()).toBeDisabled();
			expect(payFieldDecorated()).toBeTruthy();
			expect(maxDecorated()).toBeTruthy();
		});

		it('reports both shortfalls when both hold', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance: ZERO });

			const { box, payFieldDecorated } = await renderForm({ swapAmount: '150' });

			expect(box()).toHaveTextContent(boxText(ZERO));
			expect(payFieldDecorated()).toBeTruthy();
		});

		it('shows no box for a gasless swap', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance: ZERO });

			const { box, review } = await renderForm({ swapAmount: '1', isGasless: true });

			expect(box()).not.toBeInTheDocument();
			expect(review()).toBeEnabled();
		});

		// Whether the swap pays gas at all comes with the offer: a gasless one does not.
		it('shows no box before an offer is on screen', async () => {
			withContext({
				sourceToken: mockValidErc20Token,
				destinationToken: ETHEREUM_TOKEN,
				offer: false
			});
			setBalance({ token: ETHEREUM_TOKEN, balance: ZERO });

			const { box, payFieldDecorated } = await renderForm({ swapAmount: '1' });

			expect(box()).not.toBeInTheDocument();
			expect(payFieldDecorated()).toBeFalsy();
		});
	});

	describe('a native swap', () => {
		const balance = 1_000_000_000_000_000_000n;

		const amountOf = (value: bigint) => toAmount({ token: ETHEREUM_TOKEN, value });

		beforeEach(() => {
			withContext({ sourceToken: ETHEREUM_TOKEN, destinationToken: mockValidErc20Token });
		});

		it('lets an amount that leaves the gas covered through', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance });

			const { box, review, payFieldDecorated } = await renderForm({
				swapAmount: amountOf(balance - ceiling)
			});

			expect(box()).not.toBeInTheDocument();
			expect(review()).toBeEnabled();
			expect(payFieldDecorated()).toBeFalsy();
		});

		// Above "Max", which leaves room for the ceiling, though the tip alone would still fit.
		it('decorates the pay field for an amount the gas no longer fits beside', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance });

			const { box, review, payFieldDecorated } = await renderForm({
				swapAmount: amountOf(balance - tip)
			});

			expect(box()).not.toBeInTheDocument();
			expect(review()).toBeDisabled();
			expect(payFieldDecorated()).toBeTruthy();
		});

		// "Max" is 0 then: the field would blame an amount no value fixes.
		it('reports a balance short of the gas alone in the box, while the amount fits it', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance: ceiling - 1n });

			const { box, review, payFieldDecorated, maxDecorated } = await renderForm({
				swapAmount: amountOf(ceiling - 1n)
			});

			expect(box()).toHaveTextContent(boxText(ceiling - 1n));
			expect(review()).toBeDisabled();
			expect(payFieldDecorated()).toBeFalsy();
			expect(maxDecorated()).toBeFalsy();
		});

		it('decorates the pay field too once the amount exceeds the balance', async () => {
			setBalance({ token: ETHEREUM_TOKEN, balance: ceiling - 1n });

			const { box, payFieldDecorated } = await renderForm({ swapAmount: amountOf(ceiling) });

			expect(box()).toHaveTextContent(boxText(ceiling - 1n));
			expect(payFieldDecorated()).toBeTruthy();
		});
	});
});
