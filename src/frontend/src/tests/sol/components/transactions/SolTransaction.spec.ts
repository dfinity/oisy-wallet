import { USDC_DECIMALS, USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
import { formatToken, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';
import SolTransaction from '$sol/components/transactions/SolTransaction.svelte';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { SolNetBalanceChange } from '$sol/types/sol-transaction-summary';
import { deriveSolTransactionSummary } from '$sol/utils/sol-transaction-summary.utils';
import {
	mapSolTransactionToUserTransaction,
	mapUserTransactionToSolTransaction
} from '$sol/utils/user-transactions.utils';
import en from '$tests/mocks/i18n.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockAtaAddress, mockSolAddress } from '$tests/mocks/sol.mock';
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

	// Stefan: an unreduced transaction should read like a swap does, with the programs it ran
	// through underneath, rather than a bare word.
	describe('a transaction OISY could not reduce', () => {
		const interaction = {
			...mockTrx,
			summary: { kind: 'other' as const },
			instructions: [
				{ kind: 'route' as const, program: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' },
				{ kind: 'route' as const, program: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' },
				{ kind: 'route' as const, program: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' }
			]
		};

		it('should list every program it ran through, each once', () => {
			const { getByText, getAllByText } = render(SolTransaction, {
				props: { transaction: interaction, token: SOLANA_TOKEN }
			});

			expect(getByText(en.transaction.text.swap_on)).toBeInTheDocument();
			expect(
				getAllByText(
					shortenWithMiddleEllipsis({ text: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' })
				)
			).toHaveLength(1);
			expect(
				getByText(
					shortenWithMiddleEllipsis({ text: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' })
				)
			).toBeInTheDocument();
		});

		// A transfer names the other side of it, which is the thing a user checks. A self-transfer
		// has one too, the user's own other account, so it is a transfer in this respect and not
		// an interaction.
		it.each(['send', 'receive', 'self'] as const)(
			'should still name the counterparty of a %s',
			(kind) => {
				const { queryByText } = render(SolTransaction, {
					props: {
						transaction: { ...interaction, summary: { kind } },
						token: SOLANA_TOKEN
					}
				});

				expect(queryByText(en.transaction.text.swap_on)).not.toBeInTheDocument();
			}
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

		// The case the whole rule exists for: sending an SPL token moves no SOL, but it still
		// costs some, and the SOL page is the only place that shows it.
		it('should show the fee alone for a transaction that moved no SOL', () => {
			const splSend = {
				...mockTrx,
				type: 'send' as const,
				fee: 5_000n,
				summary: {
					kind: 'send' as const,
					spent: { delta: -1_000_000n, tokenAddress: 'USDC', decimals: 6 }
				},
				netChanges: [{ delta: -1_000_000n, tokenAddress: 'USDC', decimals: 6 }]
			};

			const { container } = render(SolTransaction, {
				props: { transaction: splSend, token: SOLANA_TOKEN, singleToken: true }
			});

			const amount = container.querySelector('div.leading-5>span.justify-end');

			assertNonNullish(amount);

			expect(amount.textContent).toContain('-0.000005');
		});

		// A record cached before the redesign carries no summary and no net changes, only its own
		// signed value. Reading the SOL page off the net alone would report the fee as the whole
		// transaction.
		it('should keep a legacy amount on the SOL page, less the fee', () => {
			const legacy = {
				...mockTrx,
				type: 'send' as const,
				fee: 5_000n,
				value: 1_000_000n,
				summary: undefined,
				netChanges: undefined
			};

			const { container } = render(SolTransaction, {
				props: { transaction: legacy, token: SOLANA_TOKEN, singleToken: true }
			});

			const amount = container.querySelector('div.leading-5>span.justify-end');

			assertNonNullish(amount);

			expect(amount.textContent).toContain('-0.001005');
		});
	});

	// One record per signature is stored under every token whose history returned it, and the
	// backend cache keeps its value and direction but not the summary or the net changes.
	describe('a SOL to USDC swap restored from the backend cache', () => {
		const netChanges: SolNetBalanceChange[] = [
			{ delta: -500_000_000n },
			{ tokenAddress: USDC_TOKEN.address, decimals: USDC_DECIMALS, delta: 75_000_000n }
		];

		const instructions: SolInstructionSummary[] = [
			{ kind: 'createTokenAccount', account: mockAtaAddress, rent: 2_039_280n },
			{ kind: 'wrap', amount: 500_000_000n },
			{ kind: 'unwrap', account: mockAtaAddress, returned: 502_039_280n }
		];

		const summary = deriveSolTransactionSummary({ netChanges, instructions });

		// Shaped as the service shapes a swap: typed by its outgoing half, valued by the SOL spent.
		const derived: SolTransactionUi = {
			...mockTrx,
			id: mockTrx.signature,
			value: 500_000_000n,
			type: 'send',
			from: mockSolAddress,
			to: mockSolAddress,
			fee: 5_000n,
			summary,
			netChanges,
			instructions
		};

		const restored = mapUserTransactionToSolTransaction({
			transaction: mapSolTransactionToUserTransaction(derived),
			address: mockSolAddress
		});

		const usdcReceived = `${formatToken({
			value: 75_000_000n,
			displayDecimals: EIGHT_DECIMALS,
			unitName: USDC_DECIMALS,
			showPlusSign: true
		})} ${getTokenDisplaySymbol(USDC_TOKEN)}`;

		const amountOf = (transaction: SolTransactionUi): string => {
			const { container } = render(SolTransaction, {
				props: { transaction, token: USDC_TOKEN }
			});

			const amount = container.querySelector('div.leading-5>span.justify-end');

			assertNonNullish(amount);

			return amount.textContent ?? '';
		};

		it('should be a swap that spent the SOL', () => {
			expect(summary.kind).toBe('swap');
			expect(summary.spent?.delta).toBe(-500_000_000n);
		});

		it('should show the USDC received on the USDC row while the record is fresh', () => {
			expect(amountOf(derived)).toBe(usdcReceived);
		});

		// Defect: the restored record has no net changes, so the row falls back to the SOL lamports,
		// negated as a send and read in USDC decimals.
		it.fails('should still show the USDC received once restored', () => {
			expect(amountOf(restored)).toBe(usdcReceived);
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

	// The asset never left, so the token it moved shows zero rather than the amount.
	it('should show a self-transfer with its amount and no balance change', () => {
		const { container, getByText } = render(SolTransaction, {
			props: {
				transaction: {
					...mockTrx,
					type: 'send',
					summary: {
						kind: 'self' as const,
						spent: { delta: -2_000_000_000n },
						counterparty: 'my-other-account'
					}
				},
				token: SOLANA_TOKEN
			}
		});

		expect(getByText('Self-transfer 2 SOL')).toBeInTheDocument();

		const amount = container.querySelector('div.leading-5>span.justify-end');

		expect(amount?.textContent).not.toContain('-2');
	});
});
