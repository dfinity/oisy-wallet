import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
import { TRANSACTION_CHILDREN_CONTAINER } from '$lib/constants/test-ids.constants';
import { formatToken } from '$lib/utils/format.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { createMockEthTransactionsUi } from '$tests/mocks/eth-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('EthTransaction', () => {
	const [mockTrx] = createMockEthTransactionsUi(1);

	it('should render correct amount for send transactions', () => {
		const { container } = render(EthTransaction, {
			props: {
				transaction: { ...mockTrx, value: 123450000000000n, type: 'send' },
				token: ETHEREUM_TOKEN
			}
		});

		const amountElement = container.querySelector('div.leading-5>span.justify-end');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: -123450000000000n,
				displayDecimals: EIGHT_DECIMALS,
				unitName: ETHEREUM_TOKEN.decimals,
				showPlusSign: false
			})} ${getTokenDisplaySymbol(ETHEREUM_TOKEN)}`
		);
	});

	it('should render correct amount for receive transactions', () => {
		const { container } = render(EthTransaction, {
			props: {
				transaction: { ...mockTrx, value: 123450000000000n, type: 'receive' },
				token: ETHEREUM_TOKEN
			}
		});

		const amountElement = container.querySelector('div.leading-5>span.justify-end');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: 123450000000000n,
				displayDecimals: EIGHT_DECIMALS,
				unitName: ETHEREUM_TOKEN.decimals,
				showPlusSign: true
			})} ${getTokenDisplaySymbol(ETHEREUM_TOKEN)}`
		);
	});

	describe('with approve transactions', () => {
		// Spender: 0x0000000000bbF5c5Fd284e657F01Bd000933C96D
		// Amount: 6000000
		const mockData =
			'0x095ea7b30000000000000000000000000000000000bbf5c5fd284e657f01bd000933c96d00000000000000000000000000000000000000000000000000000000005b8d80';

		const mockGasUsed = 21000n;
		const mockGasPrice = 1000000000n;

		const mockApproveTx = {
			...mockTrx,
			value: 123450000000000n,
			type: 'approve' as const,
			approveSpender: '0xSpenderAddress',
			data: mockData,
			gasUsed: mockGasUsed,
			gasPrice: mockGasPrice
		};

		it('should render correct label', () => {
			const { getByTestId } = render(EthTransaction, {
				props: {
					transaction: mockApproveTx,
					token: ETHEREUM_TOKEN
				}
			});

			const labelElement = getByTestId(TRANSACTION_CHILDREN_CONTAINER);

			assertNonNullish(labelElement);

			const expected = `${formatToken({
				value: 6000000n,
				displayDecimals: ETHEREUM_TOKEN.decimals,
				unitName: ETHEREUM_TOKEN.decimals
			})} ${getTokenDisplaySymbol(ETHEREUM_TOKEN)}`;

			expect(labelElement.textContent).toBe(`Approve ${expected}`);
		});

		it('should render correct fee amount', () => {
			const { container } = render(EthTransaction, {
				props: {
					transaction: mockApproveTx,
					token: ETHEREUM_TOKEN
				}
			});

			const amountElement = container.querySelector('div.leading-5>span.justify-end');

			assertNonNullish(amountElement);

			expect(amountElement.textContent).toBe(
				`${formatToken({
					value: mockGasUsed * mockGasPrice * -1n,
					displayDecimals: EIGHT_DECIMALS,
					unitName: ETHEREUM_TOKEN.decimals,
					showPlusSign: true
				})} ${getTokenDisplaySymbol(ETHEREUM_TOKEN)}`
			);
		});

		it('should handle unlimited approval', () => {
			// Spender: 0x0000000000bbF5c5Fd284e657F01Bd000933C96D
			// Amount: unlimited (max uint 256)
			const mockData =
				'0x095ea7b30000000000000000000000000000000000bbf5c5fd284e657f01bd000933c96dffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

			const { container, getByTestId } = render(EthTransaction, {
				props: {
					transaction: { ...mockApproveTx, data: mockData },
					token: ETHEREUM_TOKEN
				}
			});

			const amountElement = container.querySelector('div.leading-5>span.justify-end');

			assertNonNullish(amountElement);

			expect(amountElement.textContent).toBe(
				`${formatToken({
					value: mockGasUsed * mockGasPrice * -1n,
					displayDecimals: EIGHT_DECIMALS,
					unitName: ETHEREUM_TOKEN.decimals,
					showPlusSign: true
				})} ${getTokenDisplaySymbol(ETHEREUM_TOKEN)}`
			);

			const labelElement = getByTestId(TRANSACTION_CHILDREN_CONTAINER);

			assertNonNullish(labelElement);

			const expected = `Unlimited ${getTokenDisplaySymbol(ETHEREUM_TOKEN)}`;

			expect(labelElement.textContent).toBe(`Approve ${expected}`);
		});
	});
});
