import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
import en from '$lib/i18n/en.json';
import { formatToken } from '$lib/utils/format.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('SolTransaction', () => {
	const [mockTrx] = createMockSolTransactionsUi(1);

	it('should render correct amount for send transactions', () => {
		const { container } = render(SolTransaction, {
			props: {
				transaction: { ...mockTrx, value: 123450000000000n, type: 'send' },
				token: SOLANA_TOKEN
			}
		});

		const amountElement = container.querySelector('div.leading-5>span.justify-end');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: -123450000000000n,
				displayDecimals: EIGHT_DECIMALS,
				unitName: SOLANA_TOKEN.decimals,
				showPlusSign: false
			})} ${getTokenDisplaySymbol(SOLANA_TOKEN)}`
		);
	});

	it('should render correct amount for receive transactions', () => {
		const { container } = render(SolTransaction, {
			props: {
				transaction: { ...mockTrx, value: 123450000000000n, type: 'receive' },
				token: SOLANA_TOKEN
			}
		});

		const amountElement = container.querySelector('div.leading-5>span.justify-end');

		assertNonNullish(amountElement);

		expect(amountElement.textContent).toBe(
			`${formatToken({
				value: 123450000000000n,
				displayDecimals: EIGHT_DECIMALS,
				unitName: SOLANA_TOKEN.decimals,
				showPlusSign: true
			})} ${getTokenDisplaySymbol(SOLANA_TOKEN)}`
		);
	});

	it.each(['confirmed', 'processed'] as const)(
		'should mark a %s transaction as pending',
		(status) => {
			const { getByText } = render(SolTransaction, {
				props: { transaction: { ...mockTrx, status }, token: SOLANA_TOKEN }
			});

			expect(getByText(en.transaction.status.pending)).toBeInTheDocument();
		}
	);

	it('should mark a transaction without commitment as pending', () => {
		const { getByText } = render(SolTransaction, {
			props: { transaction: { ...mockTrx, status: null }, token: SOLANA_TOKEN }
		});

		expect(getByText(en.transaction.status.pending)).toBeInTheDocument();
	});

	it('should not mark a finalized transaction as pending', () => {
		const { queryByText } = render(SolTransaction, {
			props: { transaction: { ...mockTrx, status: 'finalized' }, token: SOLANA_TOKEN }
		});

		expect(queryByText(en.transaction.status.pending)).toBeNull();
	});
});
