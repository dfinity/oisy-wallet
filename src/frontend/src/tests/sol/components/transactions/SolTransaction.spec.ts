import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
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

	describe('where the cost of a transaction shows', () => {
		const swapIntoSol = {
			...mockTrx,
			type: 'receive' as const,
			fee: 1_270_000n,
			summary: {
				kind: 'swap' as const,
				spent: { delta: -123_000n, tokenAddress: 'USDC', decimals: 6 },
				received: { delta: 622_070n }
			},
			netChanges: [{ delta: 622_070n }, { delta: -123_000n, tokenAddress: 'USDC', decimals: 6 }]
		};

		const amountOf = (singleToken: boolean): string => {
			const { container } = render(SolTransaction, {
				props: { transaction: swapIntoSol, token: SOLANA_TOKEN, singleToken }
			});

			const amount = container.querySelector('div.leading-5>span.justify-end');

			assertNonNullish(amount);

			return amount.textContent ?? '';
		};

		// The fee here outweighs what the swap bought. Folded into the activity row it reads as a
		// loss, on the row whose sentence says SOL was received.
		it('should show what the swap moved, not the cost, in the activity', () => {
			expect(amountOf(false)).toContain('0.00062207');
			expect(amountOf(false)).not.toContain('-');
		});

		// The SOL page is where what the wallet spends on transactions becomes visible.
		it('should fold the fee in on the SOL page', () => {
			expect(amountOf(true)).toContain('-0.00064793');
		});
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
});
