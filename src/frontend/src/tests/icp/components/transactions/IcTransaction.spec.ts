import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
import { EIGHT_DECIMALS, ZERO } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import { bn1Bi } from '$tests/mocks/balances.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('IcTransaction', () => {
	const [mockTrx] = createMockIcTransactionsUi(1);

	it('should render correct amount for send transactions', () => {
		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, value: 12345n, type: 'send' },
				token: ICP_TOKEN
			}
		});

		const amountElement = container.querySelector('span.text-right>span');

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
				transaction: { ...mockTrx, value: 12345n, fee: ZERO, type: 'receive', incoming: true },
				token: ICP_TOKEN
			}
		});

		const amountElement = container.querySelector('span.text-right>span');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: 12345n,
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

		const amountElement = container.querySelector('span.text-right>span');

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

	it('should render correct label for approve transactions including full allowance amount', () => {
		const { container } = render(IcTransaction, {
			props: {
				transaction: { ...mockTrx, value: 12345n, type: 'approve' },
				token: ICP_TOKEN
			}
		});

		const labelElement = container.querySelector('span.basis-0 span.truncate');

		assertNonNullish(labelElement);

		expect(labelElement.textContent).toBe(
			`${replacePlaceholders(get(i18n).transaction.text.approve_label, {
				$approveAmount: formatToken({
					value: 12345n,
					displayDecimals: EIGHT_DECIMALS,
					unitName: ICP_TOKEN.decimals,
					showPlusSign: false
				})
			})} ${getTokenDisplaySymbol(ICP_TOKEN)}`
		);
	});
});
