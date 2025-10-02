import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { bn1Bi } from '$tests/mocks/balances.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('IcTransaction', () => {
	const [mockTrx] = createMockIcTransactionsUi(1);

	it('should render correct amount for send transactions', () => {
		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, value: 12345n, type: 'send' },
				token: ICP_TOKEN
			}
		});

		const amountElement = container.querySelector('div.leading-5>span.justify-end');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: -12345n - bn1Bi,
				displayDecimals: EIGHT_DECIMALS,
				unitName: ICP_TOKEN.decimals,
				showPlusSign: false
			})} ${getTokenDisplaySymbol(ICP_TOKEN)}`
		);
	});

	it('should render correct amount for receive transactions', () => {
		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, value: 12345n, fee: 0n, type: 'receive' },
				token: ICP_TOKEN
			}
		});

		const amountElement = container.querySelector('div.leading-5>span.justify-end');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: -12345n, // Todo: should not be negative, fix when the component is fixed
				displayDecimals: EIGHT_DECIMALS,
				unitName: ICP_TOKEN.decimals,
				showPlusSign: true
			})} ${getTokenDisplaySymbol(ICP_TOKEN)}`
		);
	});

	it('should render correct amount for approve transactions', () => {
		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, value: 12345n, fee: 5000n, type: 'approve' },
				token: ICP_TOKEN
			}
		});

		const amountElement = container.querySelector('div.leading-5>span.justify-end');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: -5000n,
				displayDecimals: EIGHT_DECIMALS,
				unitName: ICP_TOKEN.decimals,
				showPlusSign: false
			})} ${getTokenDisplaySymbol(ICP_TOKEN)}`
		);
	});
});
