import { SOLANA_DEFAULT_DECIMALS } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import type { SolAddress } from '$sol/types/address';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type { SolTransactionSummary } from '$sol/types/sol-transaction-summary';
import { mapSolInstructionSummaries } from '$sol/utils/sol-instruction-summary.utils';
import { mapSolNetBalanceChanges } from '$sol/utils/sol-net-changes.utils';
import {
	deriveSolTransactionSummary,
	formatSolInstructionSummary,
	formatSolTransactionSummary,
	solAtaFee,
	solClosesPayOthers
} from '$sol/utils/sol-transaction-summary.utils';
import en from '$tests/mocks/i18n.mock';
import { MOCK_SOL_BALANCES } from '$tests/mocks/sol-balances.mock';
import { MOCK_SOL_INSTRUCTIONS } from '$tests/mocks/sol-instructions.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockAtaAddress3,
	mockSolAddress,
	mockSolAddress2
} from '$tests/mocks/sol.mock';
import { nonNullish } from '@dfinity/utils';

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
				}),
				userAddress: mockSolAddress
			});

		// The wallet also loses the rent of the account it opens for the recipient, but rent is not
		// a traded asset: counting it would turn every such send into a swap.
		it('should call an SPL send with an account creation a send, not a swap', () => {
			const result = summary('SPL_SEND_WITH_ATA');

			expect(result.kind).toBe('send');
			expect(result.spent?.delta).toBe(-5_000_000n);
			expect(result.counterparty).toBe('DkngoujigUiRtizQViQPpHUSgJWMg3o3dLVAfj7eEjT2');
		});

		// Taken from 469iBc7...VprPgtP on mainnet. The wallet address falls by 0.00310888 SOL, of
		// which only 0.001 was wrapped and traded: the rest is the rent of the PUMP account the
		// swap opened on the way. Stating the fall as the amount traded overstates the trade, and
		// it does so on every swap that opens an account.
		it('should state what a swap traded, not the rent it paid on the way', () => {
			const wsol = mockAtaAddress;
			const pump = mockAtaAddress2;

			const result = deriveSolTransactionSummary({
				netChanges: [
					{ delta: -3_108_880n },
					{
						tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
						delta: 37_272_943n,
						decimals: 6
					}
				],
				instructions: [
					{ kind: 'createTokenAccount', account: wsol, rent: 2_039_280n },
					{ kind: 'wrap', amount: 1_000_000n },
					{ kind: 'unwrap', account: wsol, returned: 3_039_280n },
					{ kind: 'createTokenAccount', account: pump, rent: 2_108_880n }
				],
				userAddress: mockSolAddress
			});

			expect(result.kind).toBe('swap');
			expect(result.spent?.delta).toBe(-1_000_000n);
			expect(result.received?.delta).toBe(37_272_943n);
		});

		// The rent came straight back, so it never cost the transaction anything and the amount
		// traded is the fall in the balance exactly.
		it('should leave a swap alone when the accounts it opens are all closed again', () => {
			const wsol = mockAtaAddress;

			const result = deriveSolTransactionSummary({
				netChanges: [
					{ delta: -1_000_000n },
					{
						tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
						delta: 250_000n,
						decimals: 6
					}
				],
				instructions: [
					{ kind: 'createTokenAccount', account: wsol, rent: 2_039_280n },
					{ kind: 'wrap', amount: 1_000_000n },
					{ kind: 'unwrap', account: wsol, returned: 3_039_280n }
				],
				userAddress: mockSolAddress
			});

			expect(result.spent?.delta).toBe(-1_000_000n);
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
				],
				userAddress: mockSolAddress
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
				],
				userAddress: mockSolAddress
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
				],
				userAddress: mockSolAddress
			});

			expect(result.kind).toBe('send');
		});

		// An approval moves nothing, so the net is empty; claiming a send or a receive would
		// invent a movement the transaction never made.
		it('should call a transaction with no net movement other', () => {
			expect(
				deriveSolTransactionSummary({
					netChanges: [],
					instructions: [{ kind: 'approve', counterparty: 'spender', account: 'ata' }],
					userAddress: mockSolAddress
				}).kind
			).toBe('other');
		});
	});

	describe('solClosesPayOthers', () => {
		const close = (counterparty?: SolAddress): SolInstructionSummary => ({
			kind: 'closeTokenAccount',
			account: mockAtaAddress,
			...(nonNullish(counterparty) && { counterparty })
		});

		it('should accept a close that pays the wallet', () => {
			expect(
				solClosesPayOthers({
					instructions: [close(mockSolAddress)],
					userAddress: mockSolAddress
				})
			).toBeFalsy();
		});

		it('should catch a close that pays anybody else', () => {
			expect(
				solClosesPayOthers({
					instructions: [close(mockSolAddress2)],
					userAddress: mockSolAddress
				})
			).toBeTruthy();
		});

		// An account of the user's own still holds lamports under its rent reserve rather than as a
		// balance, so a close paying into one is not the balance coming back.
		it('should catch a close that pays another account of the user', () => {
			expect(
				solClosesPayOthers({
					instructions: [close(mockAtaAddress)],
					userAddress: mockSolAddress
				})
			).toBeTruthy();
		});

		it('should catch an unwrap that pays somebody else', () => {
			expect(
				solClosesPayOthers({
					instructions: [{ ...close(mockSolAddress2), kind: 'unwrap' }],
					userAddress: mockSolAddress
				})
			).toBeTruthy();
		});

		// The reason this lives here rather than with the message: a program's own calls reach the
		// review only through this list, nested under the instruction that made them.
		it('should catch a close made inside a routed swap', () => {
			expect(
				solClosesPayOthers({
					instructions: [
						{ kind: 'route', children: [close(mockSolAddress2)] } as SolInstructionSummary
					],
					userAddress: mockSolAddress
				})
			).toBeTruthy();
		});

		it('should leave a close whose destination was never read alone', () => {
			expect(
				solClosesPayOthers({ instructions: [close()], userAddress: mockSolAddress })
			).toBeFalsy();
		});

		// Refusing on an address nobody has would refuse every close in a review the wallet could
		// not attribute, the routine end of a swap included.
		it('should catch a close when the wallet address is not known', () => {
			expect(
				solClosesPayOthers({ instructions: [close(mockSolAddress)], userAddress: undefined })
			).toBeTruthy();
		});

		it('should accept a list with no close in it', () => {
			expect(
				solClosesPayOthers({
					instructions: [{ kind: 'createTokenAccount', account: mockAtaAddress }],
					userAddress: mockSolAddress
				})
			).toBeFalsy();
		});
	});

	describe('solAtaFee', () => {
		const RENT = 2_039_280n;
		const WALLET = mockSolAddress;
		const STRANGER = mockSolAddress2;

		const fee = (instructions: SolInstructionSummary[]): bigint =>
			solAtaFee({ instructions, userAddress: WALLET });

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
			expect(fee([create()])).toBe(RENT);
		});

		it('should charge the rent of each of several accounts', () => {
			expect(fee([create(), create()])).toBe(RENT * 2n);
		});

		// Only a close that pays the wallet reduces what the transaction cost. Crediting a
		// hand-over would report the smaller number exactly where the larger one matters.
		it('should not credit a close that named somebody else', () => {
			expect(fee([create(), { ...close(), counterparty: STRANGER }])).toBe(RENT);
		});

		it('should not credit an unwrap that named somebody else', () => {
			expect(
				fee([
					create(),
					{
						kind: 'unwrap',
						account: mockAtaAddress,
						returned: 5_000_000_000n,
						counterparty: STRANGER
					}
				])
			).toBe(RENT);
		});

		// An account of the user's own is not the wallet: lamports paid into it sit under its rent
		// reserve rather than in a balance they can spend.
		it('should not credit a close that named another account of the user', () => {
			expect(fee([create(), { ...close(), counterparty: mockAtaAddress2 }])).toBe(RENT);
		});

		it('should credit a close that named the wallet', () => {
			expect(fee([create(), { ...close(), counterparty: WALLET }])).toBe(ZERO);
		});

		// A close names no destination when the effect was recorded without one. Turning those into
		// losses would be its own misreport.
		it('should credit a close that named nobody', () => {
			expect(fee([create(), close()])).toBe(ZERO);
		});

		it('should charge both rents when a chain of closes ends at a stranger', () => {
			expect(
				fee([
					create(),
					{ kind: 'createTokenAccount', account: mockAtaAddress2, rent: RENT },
					{ ...close(), counterparty: mockAtaAddress2 },
					{
						kind: 'closeTokenAccount',
						account: mockAtaAddress2,
						returned: RENT * 2n,
						counterparty: STRANGER
					}
				])
			).toBe(RENT * 2n);
		});

		it('should charge nothing when a chain of closes ends at the wallet', () => {
			expect(
				fee([
					create(),
					{ kind: 'createTokenAccount', account: mockAtaAddress2, rent: RENT },
					{ ...close(), counterparty: mockAtaAddress2 },
					{
						kind: 'closeTokenAccount',
						account: mockAtaAddress2,
						returned: RENT * 2n,
						counterparty: WALLET
					}
				])
			).toBe(ZERO);
		});

		// What the last close hands over already includes everything the earlier ones paid into it,
		// so crediting each link counts the same lamports once per link. Three accounts opened and
		// two of them chained home leaves exactly one rent standing.
		it('should credit the lamports of a chain once', () => {
			const third = mockAtaAddress3;

			expect(
				fee([
					create(),
					{ kind: 'createTokenAccount', account: mockAtaAddress2, rent: RENT },
					{ kind: 'createTokenAccount', account: third, rent: RENT },
					{ ...close(), counterparty: mockAtaAddress2 },
					{
						kind: 'closeTokenAccount',
						account: mockAtaAddress2,
						returned: RENT * 2n,
						counterparty: WALLET
					}
				])
			).toBe(RENT);
		});

		// The message is the dApp's to arrange, so a crafted one can name a cycle of closes. Asking
		// only about the wallet never follows one, which is what keeps it from being walked at all.
		it('should not follow a cycle of closes', () => {
			expect(() =>
				fee([
					{ ...close(), counterparty: mockAtaAddress2 },
					{
						kind: 'closeTokenAccount',
						account: mockAtaAddress2,
						returned: RENT,
						counterparty: mockAtaAddress
					}
				])
			).not.toThrow();
		});

		// The account is gone by the end of the transaction, so its rent is back in the wallet.
		// Billing the open alone charges the user for something they no longer have.
		it('should charge nothing when it closes what it opened', () => {
			expect(fee([create(), { ...close(), counterparty: WALLET }])).toBe(ZERO);
		});

		it('should charge only the difference when it opens more than it closes', () => {
			expect(fee([create(), create(), { ...close(), counterparty: WALLET }])).toBe(RENT);
		});

		// Closing more than it opens leaves the user with SOL they did not start with, and a fee
		// below zero says something a fee cannot say.
		it('should never go below zero when it closes more than it opens', () => {
			expect(
				fee([
					{ ...close(), counterparty: WALLET },
					{ ...close(), counterparty: WALLET }
				])
			).toBe(ZERO);
		});

		it('should net an unwrap by the rent alone, not by the SOL it unwrapped', () => {
			expect(
				fee([
					create(),
					{
						kind: 'unwrap',
						account: mockAtaAddress,
						returned: 5_000_000_000n,
						counterparty: WALLET
					}
				])
			).toBe(ZERO);
		});

		it('should still charge an account it opens beside a wrap it unwraps', () => {
			expect(
				fee([
					create(),
					{ kind: 'createTokenAccount', account: mockAtaAddress2, rent: RENT },
					{
						kind: 'unwrap',
						account: mockAtaAddress,
						returned: 5_000_000_000n,
						counterparty: WALLET
					}
				])
			).toBe(RENT);
		});

		it('should net nothing for an unwrap of an account it did not open', () => {
			expect(
				fee([
					{
						kind: 'unwrap',
						account: mockAtaAddress,
						returned: 5_000_000_000n,
						counterparty: WALLET
					}
				])
			).toBe(ZERO);
		});

		it('should read the accounts a route opened under it', () => {
			expect(
				fee([{ kind: 'route', children: [create(), { ...close(), counterparty: WALLET }] }])
			).toBe(ZERO);
		});

		it('should charge nothing for a transaction that touches no account', () => {
			expect(fee([])).toBe(ZERO);
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
				decimalsOf: () => SOLANA_DEFAULT_DECIMALS,
				userAddress: mockSolAddress
			}).detail;

		// Closing hands back the account's whole lamport balance. For a wrapped SOL account that is
		// the rent plus the SOL that was wrapped, so calling it rent understates it by the wrapping.
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

		// The balance goes where the close names it. Saying it came back, when it did not, states
		// the one thing about a close that matters wrongly.
		it('should not say a close came back when it named somebody else', () => {
			expect(
				detailOf({
					kind: 'closeTokenAccount',
					returned: 5_002_039_280n,
					counterparty: mockSolAddress2
				})
			).toBe('5.00203928 SOL to');
		});

		it('should say so of an unwrap that named somebody else too', () => {
			expect(
				detailOf({ kind: 'unwrap', returned: 2_039_280n, counterparty: mockSolAddress2 })
			).toBe('0.00203928 SOL to');
		});

		// An account of the user's own is not the wallet, and the cost figure does not credit one
		// either: the lamports end up under that account's rent reserve rather than in a balance.
		it('should not say a close came back when it named another account of the user', () => {
			expect(
				detailOf({
					kind: 'closeTokenAccount',
					returned: 2_039_280n,
					counterparty: mockAtaAddress2,
					own: true
				})
			).toBe('0.00203928 SOL to');
		});

		it('should name the destination when the amount is not known either', () => {
			expect(detailOf({ kind: 'closeTokenAccount', counterparty: mockSolAddress2 })).toBe(
				en.transaction.text.instruction_balance_returned_to
			);
		});

		it('should still say it came back when the close named the wallet', () => {
			expect(
				detailOf({
					kind: 'closeTokenAccount',
					returned: 2_039_280n,
					counterparty: mockSolAddress
				})
			).toBe('0.00203928 SOL returned to your wallet');
		});
	});
});
