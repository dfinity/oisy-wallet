import { SOLANA_DEFAULT_DECIMALS } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type { SolTransactionSummary } from '$sol/types/sol-transaction-summary';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { mapSolNetBalanceChanges } from '$sol/utils/sol-net-changes.utils';
import {
	deriveSolTransactionSummary,
	formatSolInstructionSummary,
	formatSolTransactionSummary,
	solAtaFee
} from '$sol/utils/sol-transaction-summary.utils';
import en from '$tests/mocks/i18n.mock';
import { MOCK_SOL_BALANCES } from '$tests/mocks/sol-balances.mock';
import { MOCK_SOL_INSTRUCTIONS } from '$tests/mocks/sol-instructions.mock';
import { mockAtaAddress, mockAtaAddress2 } from '$tests/mocks/sol.mock';

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
		it("should call a transfer between the user's own accounts a self-transfer", () => {
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

	describe('solAtaFee', () => {
		const RENT = 2_039_280n;

		const create = (rent = RENT): SolInstructionSummary => ({
			kind: 'createTokenAccount',
			account: mockAtaAddress,
			rent
		});

		const close = (returned = RENT): SolInstructionSummary => ({
			kind: 'closeTokenAccount',
			account: mockAtaAddress,
			returned
		});

		it('should charge the rent of an account it only opens', () => {
			expect(solAtaFee([create()])).toBe(RENT);
		});

		it('should charge the rent of each of several accounts', () => {
			expect(solAtaFee([create(), create()])).toBe(RENT * 2n);
		});

		// The account is gone by the end of the transaction, so its rent is back in the wallet.
		// Billing the open alone charges the user for something they no longer have.
		it('should charge nothing when it closes what it opened', () => {
			expect(solAtaFee([create(), close()])).toBe(ZERO);
		});

		it('should charge only the difference when it opens more than it closes', () => {
			expect(solAtaFee([create(), create(), close()])).toBe(RENT);
		});

		// A refund is not a negative fee. It nets to nothing, and the caller shows nothing.
		it('should never go below zero when it closes more than it opens', () => {
			expect(solAtaFee([close(), close()])).toBe(ZERO);
		});

		// A wrap opens an account and the unwrap closes it, so its rent comes back like any other.
		// What must not come back is the wrapped SOL the close hands over with it.
		it('should net an unwrap by the rent alone, not by the SOL it unwrapped', () => {
			expect(
				solAtaFee([create(), { kind: 'unwrap', account: mockAtaAddress, returned: 5_000_000_000n }])
			).toBe(ZERO);
		});

		it('should still charge an account it opens beside a wrap it unwraps', () => {
			expect(
				solAtaFee([
					create(),
					{ kind: 'createTokenAccount', account: mockAtaAddress2, rent: RENT },
					{ kind: 'unwrap', account: mockAtaAddress2, returned: 5_000_000_000n }
				])
			).toBe(RENT);
		});

		// Its rent was paid by whatever transaction opened it, so this one has nothing to refund.
		// Crediting the balance would report a fee of zero for rent this transaction did pay.
		it('should net nothing for an unwrap of an account it did not open', () => {
			expect(
				solAtaFee([
					create(),
					{ kind: 'unwrap', account: mockAtaAddress2, returned: 5_000_000_000n }
				])
			).toBe(RENT);
		});

		it('should read the accounts a route opened under it', () => {
			expect(solAtaFee([{ kind: 'route', children: [create(), close()] }])).toBe(ZERO);
		});

		it('should charge nothing for a transaction that touches no account', () => {
			expect(solAtaFee([])).toBe(ZERO);
		});
	});

	describe('formatSolTransactionSummary', () => {
		const format = (summary: SolTransactionSummary): string =>
			formatSolTransactionSummary({
				summary,
				i18n: en,
				symbolOf: (tokenAddress) => tokenAddress ?? 'SOL',
				amountOf: ({ delta }) => `${delta < ZERO ? -delta : delta}`
			});

		// The figure is in the amount column beside it, and saying it twice reads as two movements.
		it('should say a send and a receive as a word', () => {
			expect(format({ kind: 'send', spent: { delta: -1n } })).toBe(en.send.text.send);
			expect(format({ kind: 'receive', received: { delta: 1n } })).toBe(en.receive.text.receive);
		});

		// In a day of swaps the pair is the only thing telling one row from another. The figures
		// stay out: the amount column beside the sentence carries them.
		it('should say a swap as its pair, without the figures', () => {
			expect(
				format({
					kind: 'swap',
					spent: { delta: -5n, tokenAddress: 'USDC' },
					received: { delta: 7n, tokenAddress: 'RAY' }
				})
			).toBe('Swap USDC to RAY');
		});

		// The asset never left, so the amount column shows zero and the sentence is the only place
		// the figure that moved can appear.
		it('should say a self-transfer with its amount', () => {
			expect(format({ kind: 'self', spent: { delta: -3n, tokenAddress: 'USDC' } })).toBe(
				'Self-transfer 3 USDC'
			);
		});

		it('should fall back to a word for a transaction it cannot reduce', () => {
			expect(format({ kind: 'other' })).toBe(en.transaction.text.kind_other);
		});
	});

	describe('formatSolInstructionSummary', () => {
		const detailOf = (instruction: SolInstructionSummary): string | undefined =>
			formatSolInstructionSummary({
				instruction,
				i18n: en,
				symbolOf: (tokenAddress) => tokenAddress ?? 'SOL',
				decimalsOf: () => SOLANA_DEFAULT_DECIMALS
			}).detail;

		// Closing hands back the account's whole balance. For a wrapped SOL account that is the
		// rent plus the SOL that was wrapped, so calling it rent understates it by the wrapping.
		it('should say what a close hands back when the amount is known', () => {
			expect(detailOf({ kind: 'closeTokenAccount', returned: 5_002_039_280n })).toBe(
				'5.00203928 SOL returned to your wallet'
			);
		});

		it('should fall back to naming the rent when the amount is not known', () => {
			expect(detailOf({ kind: 'closeTokenAccount' })).toBe(
				en.transaction.text.instruction_rent_returned
			);
		});

		it('should say the same of an unwrap, which is a close', () => {
			expect(detailOf({ kind: 'unwrap', returned: 2_039_280n })).toBe(
				'0.00203928 SOL returned to your wallet'
			);
		});
	});
});
