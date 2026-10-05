import { USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import type { Token } from '$lib/types/token';
import { solUnreadableTransactionsWarnings } from '$sol/derived/sol-unreadable-transactions.derived';
import { solUnreadableTransactionsWarningStore } from '$sol/stores/sol-unreadable-transactions-warning.store';
import { solUnreadableTransactionsStore } from '$sol/stores/sol-unreadable-transactions.store';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { get, type Writable } from 'svelte/store';

vi.mock('$lib/derived/network-tokens.derived', async () => {
	const { writable } = await import('svelte/store');

	return { enabledFungibleNetworkTokens: writable([]) };
});

describe('sol-unreadable-transactions.derived', () => {
	const enabledTokens = enabledFungibleNetworkTokens as unknown as Writable<Token[]>;

	const { signature } = mockSolSignatureResponse();
	const { signature: signature2 } = mockSolSignatureResponse();

	beforeEach(() => {
		enabledTokens.set([SOLANA_TOKEN, USDC_TOKEN, ICP_TOKEN]);

		[SOLANA_TOKEN, USDC_TOKEN, ICP_TOKEN].forEach(({ id }) =>
			solUnreadableTransactionsStore.reset(id)
		);
		solUnreadableTransactionsWarningStore.reset();
	});

	describe('solUnreadableTransactionsWarnings', () => {
		it('should be empty when no history misses a transaction', () => {
			expect(get(solUnreadableTransactionsWarnings)).toStrictEqual([]);
		});

		it('should list each token whose history misses one, with those it misses', () => {
			solUnreadableTransactionsStore.add({ tokenId: SOLANA_TOKEN.id, signatures: [signature] });
			solUnreadableTransactionsStore.add({
				tokenId: USDC_TOKEN.id,
				signatures: [signature, signature2]
			});

			expect(get(solUnreadableTransactionsWarnings)).toStrictEqual([
				{ token: SOLANA_TOKEN, signatures: [signature] },
				{ token: USDC_TOKEN, signatures: [signature, signature2] }
			]);
		});

		it('should leave out what the user dismissed', () => {
			solUnreadableTransactionsStore.add({
				tokenId: USDC_TOKEN.id,
				signatures: [signature, signature2]
			});

			solUnreadableTransactionsWarningStore.dismiss([
				{ token: USDC_TOKEN, signatures: [signature] }
			]);

			expect(get(solUnreadableTransactionsWarnings)).toStrictEqual([
				{ token: USDC_TOKEN, signatures: [signature2] }
			]);
		});

		// One transaction can be missing from two histories: dismissing it for one token says
		// nothing about the other.
		it('should keep a transaction dismissed for one token for the others', () => {
			solUnreadableTransactionsStore.add({ tokenId: SOLANA_TOKEN.id, signatures: [signature] });
			solUnreadableTransactionsStore.add({ tokenId: USDC_TOKEN.id, signatures: [signature] });

			solUnreadableTransactionsWarningStore.dismiss([
				{ token: SOLANA_TOKEN, signatures: [signature] }
			]);

			expect(get(solUnreadableTransactionsWarnings)).toStrictEqual([
				{ token: USDC_TOKEN, signatures: [signature] }
			]);
		});

		it('should warn again about a token that misses another transaction after a dismissal', () => {
			solUnreadableTransactionsStore.add({ tokenId: SOLANA_TOKEN.id, signatures: [signature] });

			solUnreadableTransactionsWarningStore.dismiss([
				{ token: SOLANA_TOKEN, signatures: [signature] }
			]);

			expect(get(solUnreadableTransactionsWarnings)).toStrictEqual([]);

			solUnreadableTransactionsStore.add({ tokenId: SOLANA_TOKEN.id, signatures: [signature2] });

			expect(get(solUnreadableTransactionsWarnings)).toStrictEqual([
				{ token: SOLANA_TOKEN, signatures: [signature2] }
			]);
		});

		it('should leave out a token that is not enabled', () => {
			enabledTokens.set([SOLANA_TOKEN]);

			solUnreadableTransactionsStore.add({ tokenId: USDC_TOKEN.id, signatures: [signature] });

			expect(get(solUnreadableTransactionsWarnings)).toStrictEqual([]);
		});

		it('should leave out a token of another chain', () => {
			solUnreadableTransactionsStore.add({ tokenId: ICP_TOKEN.id, signatures: [signature] });

			expect(get(solUnreadableTransactionsWarnings)).toStrictEqual([]);
		});
	});
});
