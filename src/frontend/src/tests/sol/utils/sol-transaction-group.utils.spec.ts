import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { Token } from '$lib/types/token';
import type { AllTransactionUiWithCmp } from '$lib/types/transaction-ui';
import { groupSolTransactionsBySignature } from '$sol/utils/sol-transaction-group.utils';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';
import { signature } from '@solana/kit';

describe('sol-transaction-group.utils', () => {
	describe('groupSolTransactionsBySignature', () => {
		const solLeg = ({
			id,
			sig,
			type = 'send',
			value = 5_000_000n,
			token = SOLANA_TOKEN
		}: {
			id: string;
			sig: string;
			type?: 'send' | 'receive';
			value?: bigint;
			token?: Token;
		}) =>
			({
				component: 'solana',
				token,
				transaction: {
					...createMockSolTransactionUi(id),
					signature: signature(sig),
					type,
					value
				}
			}) as AllTransactionUiWithCmp;

		const SIG_A =
			'4nHTGWvzTAKZJKMQ8bYVQvbeBYA7BiWLbmpmvY6zrGiKAcNaWKvyPGCFEXaLqrgvPPnFC1BwXeMoLPcTGJgvKAnQ';
		const SIG_B =
			'2ZmXQyMpJhRDGDCJZcxKMzTiPtBLoWvBBmoM4a7WUqQVsvHtqAkKvBLjPFoBEwPLPYbrKCkgLBcJZoNQBqPtRvJs';

		it('should put the rows of one transaction into a single group', () => {
			const entries = groupSolTransactionsBySignature([
				solLeg({ id: 'a1', sig: SIG_A }),
				solLeg({ id: 'a2', sig: SIG_A, token: mockValidSplToken })
			]);

			expect(entries).toHaveLength(1);
			expect(entries[0].kind).toBe('group');

			if (entries[0].kind === 'group') {
				expect(entries[0].group.signature).toBe(SIG_A);
				expect(entries[0].group.transactions).toHaveLength(2);
			}
		});

		// A group of one would be a collapsible that hides nothing.
		it('should leave a lone row alone', () => {
			const entries = groupSolTransactionsBySignature([solLeg({ id: 'a1', sig: SIG_A })]);

			expect(entries).toStrictEqual([
				{ kind: 'transaction', transaction: solLeg({ id: 'a1', sig: SIG_A }) }
			]);
		});

		it('should keep rows of different transactions apart', () => {
			const entries = groupSolTransactionsBySignature([
				solLeg({ id: 'a1', sig: SIG_A }),
				solLeg({ id: 'b1', sig: SIG_B })
			]);

			expect(entries.map(({ kind }) => kind)).toStrictEqual(['transaction', 'transaction']);
		});

		it('should pass rows of other chains through untouched', () => {
			const btc = {
				component: 'bitcoin',
				token: SOLANA_TOKEN,
				transaction: { id: 'btc-1', type: 'send', status: 'confirmed', from: 'a', value: 1n }
			} as unknown as AllTransactionUiWithCmp;

			const entries = groupSolTransactionsBySignature([btc, solLeg({ id: 'a1', sig: SIG_A })]);

			expect(entries).toHaveLength(2);
			expect(entries[0]).toStrictEqual({ kind: 'transaction', transaction: btc });
		});

		// The group takes the place of its first row, so a sorted list stays sorted.
		it('should hold the position of the first row of a group', () => {
			const first = solLeg({ id: 'b1', sig: SIG_B });

			const entries = groupSolTransactionsBySignature([
				first,
				solLeg({ id: 'a1', sig: SIG_A }),
				solLeg({ id: 'a2', sig: SIG_A, token: mockValidSplToken })
			]);

			expect(entries.map(({ kind }) => kind)).toStrictEqual(['transaction', 'group']);
		});

		describe('legs', () => {
			const legsOf = (entries: ReturnType<typeof groupSolTransactionsBySignature>) =>
				entries[0].kind === 'group' ? entries[0].group.legs : [];

			it('should net a send as negative and a receive as positive', () => {
				const entries = groupSolTransactionsBySignature([
					solLeg({ id: 'a1', sig: SIG_A, type: 'send', value: 5_000_000n }),
					solLeg({
						id: 'a2',
						sig: SIG_A,
						type: 'receive',
						value: 377_098n,
						token: mockValidSplToken
					})
				]);

				expect(legsOf(entries)).toStrictEqual([
					{ symbol: SOLANA_TOKEN.symbol, decimals: SOLANA_TOKEN.decimals, net: -5_000_000n },
					{
						symbol: mockValidSplToken.symbol,
						decimals: mockValidSplToken.decimals,
						net: 377_098n
					}
				]);
			});

			// A routed swap touches the same mint more than once, and only the net is a fact.
			it('should cancel legs of the same token', () => {
				const entries = groupSolTransactionsBySignature([
					solLeg({ id: 'a1', sig: SIG_A, type: 'send', value: 5_000_000n }),
					solLeg({ id: 'a2', sig: SIG_A, type: 'receive', value: 1_000_000n }),
					solLeg({ id: 'a3', sig: SIG_A, type: 'receive', value: 2n, token: mockValidSplToken })
				]);

				expect(legsOf(entries)).toStrictEqual([
					{ symbol: SOLANA_TOKEN.symbol, decimals: SOLANA_TOKEN.decimals, net: -4_000_000n },
					{ symbol: mockValidSplToken.symbol, decimals: mockValidSplToken.decimals, net: 2n }
				]);
			});

			it('should drop a token that came back to where it started', () => {
				const entries = groupSolTransactionsBySignature([
					solLeg({ id: 'a1', sig: SIG_A, type: 'send', value: 5_000_000n }),
					solLeg({ id: 'a2', sig: SIG_A, type: 'receive', value: 5_000_000n }),
					solLeg({ id: 'a3', sig: SIG_A, type: 'receive', value: 2n, token: mockValidSplToken })
				]);

				expect(legsOf(entries)).toStrictEqual([
					{ symbol: mockValidSplToken.symbol, decimals: mockValidSplToken.decimals, net: 2n }
				]);
			});
		});

		describe('isSwap', () => {
			const isSwapOf = (entries: ReturnType<typeof groupSolTransactionsBySignature>) =>
				entries[0].kind === 'group' ? entries[0].group.isSwap : undefined;

			it('should call one token out and one token in a swap', () => {
				const entries = groupSolTransactionsBySignature([
					solLeg({ id: 'a1', sig: SIG_A, type: 'send', value: 5_000_000n }),
					solLeg({
						id: 'a2',
						sig: SIG_A,
						type: 'receive',
						value: 377_098n,
						token: mockValidSplToken
					})
				]);

				expect(isSwapOf(entries)).toBeTruthy();
			});

			// Two tokens leaving is a payment in two parts, not an exchange.
			it('should not call two outgoing tokens a swap', () => {
				const entries = groupSolTransactionsBySignature([
					solLeg({ id: 'a1', sig: SIG_A, type: 'send', value: 5_000_000n }),
					solLeg({ id: 'a2', sig: SIG_A, type: 'send', value: 100_000n, token: mockValidSplToken })
				]);

				expect(isSwapOf(entries)).toBeFalsy();
			});
		});
	});
});
