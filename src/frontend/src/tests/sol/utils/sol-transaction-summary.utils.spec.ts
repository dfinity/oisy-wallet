import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { mapSolNetBalanceChanges } from '$sol/utils/sol-net-changes.utils';
import { deriveSolTransactionSummary } from '$sol/utils/sol-transaction-summary.utils';
import { MOCK_SOL_BALANCES } from '$tests/mocks/sol-balances.mock';
import { MOCK_SOL_INSTRUCTIONS } from '$tests/mocks/sol-instructions.mock';

const USER = '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q';

describe('sol-transaction-summary.utils', () => {
	describe('deriveSolTransactionSummary', () => {
		// The mint of an unchecked transfer comes from the token balances, exactly as the service
		// derives it in production: the instruction itself does not name one.
		const addressToToken = (fixture: keyof typeof MOCK_SOL_BALANCES): Record<string, string> => {
			const { accountKeys, preTokenBalances, postTokenBalances } = MOCK_SOL_BALANCES[fixture];

			return [...preTokenBalances, ...postTokenBalances].reduce(
				(acc, { accountIndex, mint }) => ({ ...acc, [accountKeys[accountIndex].pubkey]: mint }),
				{}
			);
		};

		const summary = (fixture: keyof typeof MOCK_SOL_INSTRUCTIONS) =>
			deriveSolTransactionSummary({
				netChanges: mapSolNetBalanceChanges({ address: USER, ...MOCK_SOL_BALANCES[fixture] }),
				instructions: mapSolInstructionSummaries({
					...MOCK_SOL_INSTRUCTIONS[fixture],
					addressToToken: addressToToken(fixture)
				})
			});

		// The wallet also loses the rent of the account it opens for the recipient, but rent is not
		// a traded asset: counting it would turn every such send into a swap.
		it('should call an SPL send with an account creation a send, not a swap', () => {
			const result = summary('SPL_SEND_WITH_ATA');

			expect(result.kind).toBe('send');
			expect(result.spent?.delta).toBe(-5_000_000n);
			expect(result.counterparty).toBe('DkngoujigUiRtizQViQPpHUSgJWMg3o3dLVAfj7eEjT2');
		});

		it('should call a routed swap a swap with the pair at its ends', () => {
			const result = summary('JUPITER_SWAP');

			expect(result.kind).toBe('swap');
			expect(result.spent?.tokenAddress).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
			expect(result.received?.tokenAddress).toBe('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R');
		});

		it('should net a swap split across pools into a single swap', () => {
			const result = summary('ORCA_SPLIT_SWAP');

			expect(result.kind).toBe('swap');
			expect(result.spent?.delta).toBe(-100_000n);
			expect(result.received?.delta).toBe(86_102n);
		});

		it('should call a swap paid in SOL a swap, since the SOL was traded', () => {
			const result = summary('DFLOW_SWAP');

			expect(result.kind).toBe('swap');
			expect(result.spent?.tokenAddress).toBeUndefined();
			expect(result.received?.tokenAddress).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
		});

		it('should call a transaction that touches nothing of the user’s other', () => {
			expect(summary('THIRD_PARTY').kind).toBe('other');
		});

		it('should call a plain incoming transfer a receive with its sender', () => {
			const result = deriveSolTransactionSummary({
				netChanges: [{ tokenAddress: 'mint', decimals: 6, delta: 42_000_000n }],
				instructions: [
					{ kind: 'receive', amount: 42_000_000n, tokenAddress: 'mint', counterparty: 'sender' }
				]
			});

			expect(result.kind).toBe('receive');
			expect(result.counterparty).toBe('sender');
		});

		// The asset never left, so the net is zero: without the legs this reads as a transaction
		// that did nothing at all.
		it('should call a transfer between the user's own accounts a self-transfer', () => {
			const result = deriveSolTransactionSummary({
				netChanges: [],
				instructions: [
					{
						kind: 'send',
						amount: 5_000_000n,
						tokenAddress: 'mint',
						decimals: 6,
						counterparty: 'my-other-ata',
						own: true
					}
				]
			});

			expect(result.kind).toBe('self');
			expect(result.spent?.delta).toBe(-5_000_000n);
			expect(result.counterparty).toBe('my-other-ata');
		});

		it('should not call a transfer to a stranger a self-transfer', () => {
			const result = deriveSolTransactionSummary({
				netChanges: [{ tokenAddress: 'mint', decimals: 6, delta: -5_000_000n }],
				instructions: [
					{
						kind: 'send',
						amount: 5_000_000n,
						tokenAddress: 'mint',
						counterparty: 'stranger',
						own: false
					}
				]
			});

			expect(result.kind).toBe('send');
		});

		// An approval moves nothing, so the net is empty; claiming a send or a receive would
		// invent a movement the transaction never made.
		it('should call a transaction with no net movement other', () => {
			expect(
				deriveSolTransactionSummary({
					netChanges: [],
					instructions: [{ kind: 'approve', counterparty: 'spender', account: 'ata' }]
				}).kind
			).toBe('other');
		});
	});
});
