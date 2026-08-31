import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';
import en from '$tests/mocks/i18n.mock';
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

	// One transaction produces a row per token it moved, and it is stored as a send or a receive
	// of one of the two sides. Badged by that alone, one half of a swap points out and the other
	// points in, which reads as two unrelated transfers.
	it('should badge both sides of a swap the same way', () => {
		const swap = {
			...mockTrx,
			summary: {
				kind: 'swap' as const,
				spent: { delta: -100n, tokenAddress: 'USDC', decimals: 6 },
				received: { delta: 7n, tokenAddress: 'RAY', decimals: 6 }
			}
		};

		const badgeOf = (type: 'send' | 'receive'): string => {
			const { container } = render(SolTransaction, {
				props: { transaction: { ...swap, type }, token: SOLANA_TOKEN, iconType: 'token' }
			});

			const badge = container.querySelector('[data-tid="icon-badge"]');

			assertNonNullish(badge);

			return badge.innerHTML;
		};

		const sent = badgeOf('send');

		expect(sent).not.toBe('');
		expect(badgeOf('receive')).toBe(sent);
	});

	// The glyph no longer matches the stored type, so a screen reader announcing that type would
	// call one half of the swap a send and the other a receive.
	it('should announce both sides of a swap as a swap', () => {
		const swap = {
			...mockTrx,
			summary: {
				kind: 'swap' as const,
				spent: { delta: -100n, tokenAddress: 'USDC', decimals: 6 },
				received: { delta: 7n, tokenAddress: 'RAY', decimals: 6 }
			}
		};

		const labelOf = (type: 'send' | 'receive'): string | null => {
			const { container } = render(SolTransaction, {
				props: { transaction: { ...swap, type }, token: SOLANA_TOKEN, iconType: 'token' }
			});

			return (
				container
					.querySelector('[data-tid="icon-badge"]')
					?.closest('[aria-label]')
					?.getAttribute('aria-label') ?? null
			);
		};

		expect(labelOf('send')).toBe(en.swap.text.swap);
		expect(labelOf('receive')).toBe(en.swap.text.swap);
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
