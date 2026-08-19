import { ZERO } from '$lib/constants/app.constants';
import type { SolRpcTransaction } from '$sol/types/sol-transaction';
import { mapSolTransactionEffect } from '$sol/utils/sol-transaction-effect.utils';

describe('sol-transaction-effect.utils', () => {
	describe('mapSolTransactionEffect', () => {
		const OWNER = 'HoLDer111111111111111111111111111111111111';
		const OTHER = 'OtHer2222222222222222222222222222222222222';
		const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

		const tx = ({
			preBalances = [10_000_000n, ZERO],
			postBalances = [4_545_509n, ZERO],
			preTokenBalances = [],
			postTokenBalances = []
		}: {
			preBalances?: bigint[];
			postBalances?: bigint[];
			preTokenBalances?: unknown[];
			postTokenBalances?: unknown[];
		} = {}) =>
			({
				transaction: { message: { accountKeys: [{ pubkey: OWNER }, { pubkey: OTHER }] } },
				meta: { preBalances, postBalances, preTokenBalances, postTokenBalances }
			}) as unknown as SolRpcTransaction;

		const tokenBalance = ({
			owner = OWNER,
			mint = USDC,
			amount,
			decimals = 6
		}: {
			owner?: string;
			mint?: string;
			amount: string;
			decimals?: number;
		}) => ({ accountIndex: 1, mint, owner, uiTokenAmount: { amount, decimals } });

		// The fee is lamports that left the account, so it belongs in "what happened to my balance".
		it('should net the SOL the wallet lost, fee included', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx(),
				address: OWNER,
				instructions: Array.from({ length: 7 }, () => ({ programId: 'p' })) as never
			});

			expect(effect?.legs).toStrictEqual([{ decimals: 9, net: -5_454_491n }]);
		});

		it('should count every instruction the transaction carried', () => {
			expect(
				mapSolTransactionEffect({
					transaction: tx(),
					address: OWNER,
					instructions: Array.from({ length: 7 }, () => ({ programId: 'p' })) as never
				})?.instructionsCount
			).toBe(7);
		});

		// The whole point: an instruction nobody decoded still moved value, and the balances hold it.
		it('should state a token the wallet received', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx({
					postTokenBalances: [tokenBalance({ amount: '377098' })]
				}),
				address: OWNER,
				instructions: Array.from({ length: 7 }, () => ({ programId: 'p' })) as never
			});

			expect(effect?.legs).toStrictEqual([
				{ decimals: 9, net: -5_454_491n },
				{ tokenAddress: USDC, decimals: 6, net: 377_098n }
			]);
		});

		it('should ignore token accounts the wallet does not own', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx({
					postTokenBalances: [tokenBalance({ owner: OTHER, amount: '377098' })]
				}),
				address: OWNER,
				instructions: Array.from({ length: 2 }, () => ({ programId: 'p' })) as never
			});

			expect(effect?.legs).toStrictEqual([{ decimals: 9, net: -5_454_491n }]);
		});

		// A routed swap moves the same mint through several accounts; only the net is a fact.
		it('should net a mint held across several accounts', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx({
					preTokenBalances: [
						{ ...tokenBalance({ amount: '1000' }), accountIndex: 1 },
						{ ...tokenBalance({ amount: '500' }), accountIndex: 2 }
					],
					postTokenBalances: [
						{ ...tokenBalance({ amount: '2000' }), accountIndex: 1 },
						{ ...tokenBalance({ amount: '500' }), accountIndex: 2 }
					]
				}),
				address: OWNER,
				instructions: Array.from({ length: 3 }, () => ({ programId: 'p' })) as never
			});

			expect(effect?.legs).toContainEqual({ tokenAddress: USDC, decimals: 6, net: 1_000n });
		});

		it('should drop a mint that ended where it started', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx({
					preTokenBalances: [tokenBalance({ amount: '1000' })],
					postTokenBalances: [tokenBalance({ amount: '1000' })]
				}),
				address: OWNER,
				instructions: Array.from({ length: 3 }, () => ({ programId: 'p' })) as never
			});

			expect(effect?.legs).toStrictEqual([{ decimals: 9, net: -5_454_491n }]);
		});

		it('should read what was paid before what was received', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx({ postTokenBalances: [tokenBalance({ amount: '377098' })] }),
				address: OWNER,
				instructions: Array.from({ length: 5 }, () => ({ programId: 'p' })) as never
			});

			expect(effect?.legs.map(({ net }) => net < ZERO)).toStrictEqual([true, false]);
		});

		it('should drop a SOL leg that did not move', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx({ preBalances: [10n, ZERO], postBalances: [10n, ZERO] }),
				address: OWNER,
				instructions: Array.from({ length: 1 }, () => ({ programId: 'p' })) as never
			});

			expect(effect?.legs).toStrictEqual([]);
		});

		// Without meta nothing can be stated with certainty, and the caller falls back to the rows.
		it('should state nothing when the transaction carries no meta', () => {
			expect(
				mapSolTransactionEffect({
					transaction: {
						transaction: { message: { accountKeys: [] } }
					} as unknown as SolRpcTransaction,
					address: OWNER,
					instructions: Array.from({ length: 1 }, () => ({ programId: 'p' })) as never
				})
			).toBeUndefined();
		});

		it('should state nothing about a wallet the transaction never names', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx(),
				address: 'NeVerNamed333333333333333333333333333333333',
				instructions: Array.from({ length: 1 }, () => ({ programId: 'p' })) as never
			});

			expect(effect?.legs).toStrictEqual([]);
		});

		// The plumbing every transaction is made of names nothing, so it is left out. What is left is
		// the protocol the user actually dealt with, which is what a block explorer titles by.
		it('should name the protocols it went through and skip the plumbing', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx(),
				address: OWNER,
				instructions: [
					{ programId: 'ComputeBudget111111111111111111111111111111' },
					{ programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
					{ programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' }
				] as never
			});

			expect(effect?.programs).toStrictEqual(['Jupiter']);
		});

		// A wrong label reads as a fact, so an unknown program keeps the address instead.
		it('should keep the address of a protocol it cannot name', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx(),
				address: OWNER,
				instructions: [{ programId: 'SoMeUnKnownProgram1111111111111111111111111' }] as never
			});

			expect(effect?.programs).toStrictEqual(['SoMeUnK...1111111']);
		});

		it('should name a protocol once however often it appears', () => {
			const effect = mapSolTransactionEffect({
				transaction: tx(),
				address: OWNER,
				instructions: [
					{ programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' },
					{ programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' }
				] as never
			});

			expect(effect?.programs).toStrictEqual(['Jupiter']);
		});
	});
});
