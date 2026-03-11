import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
import { ERC20_DEPOSIT_ERC20_HASH, ERC20_DEPOSIT_HASH } from '$eth/constants/erc20.constants';
import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
import { TRANSACTION_CHILDREN_CONTAINER } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { createMockEthTransactionsUi } from '$tests/mocks/eth-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock(import('$eth/derived/erc-fungible.derived'), async (importOriginal) => {
	const { readable } = await import('svelte/store');
	const { USDC_TOKEN } = await import('$env/tokens/tokens-erc20/tokens.usdc.env');

	const mockToken = { ...USDC_TOKEN, enabled: false };

	return {
		...importOriginal,
		ercFungibleTokens: readable([mockToken]),
		enabledErcFungibleTokens: readable([mockToken])
	};
});

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

	describe('with ERC20 deposit transactions', () => {
		// Decoded: { to: USDC_TOKEN.address, value: 1000000n }
		const mockDepositData = `${ERC20_DEPOSIT_HASH}000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000`;

		const mockGasUsed = 21000n;
		const mockGasPrice = 1000000000n;

		const mockDepositTx = {
			...mockTrx,
			value: 123450000000000n,
			data: mockDepositData,
			gasUsed: mockGasUsed,
			gasPrice: mockGasPrice
		};

		it('should render "Send {token}" label for send type with ERC20 deposit data', () => {
			const { getByTestId } = render(EthTransaction, {
				props: {
					transaction: { ...mockDepositTx, type: 'send' as const },
					token: ETHEREUM_TOKEN
				}
			});

			const labelElement = getByTestId(TRANSACTION_CHILDREN_CONTAINER);

			assertNonNullish(labelElement);

			const expected = replacePlaceholders(get(i18n).send.text.send_token, {
				$token: USDC_TOKEN.symbol
			});

			expect(labelElement.textContent).toBe(expected);
		});

		it('should render "Send {token}" label for deposit type with ERC20 deposit data', () => {
			const { getByTestId } = render(EthTransaction, {
				props: {
					transaction: { ...mockDepositTx, type: 'deposit' as const },
					token: ETHEREUM_TOKEN
				}
			});

			const labelElement = getByTestId(TRANSACTION_CHILDREN_CONTAINER);

			assertNonNullish(labelElement);

			const expected = replacePlaceholders(get(i18n).send.text.send_token, {
				$token: USDC_TOKEN.symbol
			});

			expect(labelElement.textContent).toBe(expected);
		});

		it('should render gas fee as display amount for ERC20 deposit', () => {
			const { container } = render(EthTransaction, {
				props: {
					transaction: { ...mockDepositTx, type: 'send' as const },
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

		it('should also detect ERC20 deposit with ERC20_DEPOSIT_ERC20_HASH', () => {
			const erc20DepositData = `${ERC20_DEPOSIT_ERC20_HASH}000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000`;

			const { container } = render(EthTransaction, {
				props: {
					transaction: { ...mockDepositTx, type: 'send' as const, data: erc20DepositData },
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

		it('should render "Send" label for non-ERC20 deposit type', () => {
			const { getByTestId } = render(EthTransaction, {
				props: {
					transaction: { ...mockDepositTx, type: 'deposit' as const, data: '0xabcdef' },
					token: ETHEREUM_TOKEN
				}
			});

			const labelElement = getByTestId(TRANSACTION_CHILDREN_CONTAINER);

			assertNonNullish(labelElement);

			expect(labelElement.textContent).toBe(get(i18n).send.text.send);
		});
	});
});
