import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { createMockEthTransactionsUi } from '$tests/mocks/eth-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('EthTransaction', () => {
	const [mockTrx] = createMockEthTransactionsUi(1);

	it('should render correct amount for send transactions', () => {
		const { container } = render(EthTransaction, {
			props: { transaction: { ...mockTrx, value: 12345n, type: 'send' }, token: ETHEREUM_TOKEN }
		});

		const amountElement = container.querySelector('div.leading-5>span.justify-end');

		assertNonNullish(amountElement);

		expect(amountElement).toHaveTextContent(
			`${formatToken({
				value: mockTrx.value,
				displayDecimals: EIGHT_DECIMALS,
				unitName: ETHEREUM_TOKEN.decimals,
				showPlusSign: false
			})} ${getTokenDisplaySymbol(ETHEREUM_TOKEN)}`
		);
	});

	it('should render correct amount for receive transactions', () => {
		const { container } = render(EthTransaction, {
			props: { transaction: { ...mockTrx, value: 12345n, type: 'receive' }, token: ETHEREUM_TOKEN }
		});

		const amountElement = container.querySelector('div.leading-5>span.justify-end');

		assertNonNullish(amountElement);

		expect(amountElement).toHaveTextContent(
			`${formatToken({
				value: mockTrx.value,
				displayDecimals: EIGHT_DECIMALS,
				unitName: ETHEREUM_TOKEN.decimals,
				showPlusSign: true
			})} ${getTokenDisplaySymbol(ETHEREUM_TOKEN)}`
		);
	});
});
