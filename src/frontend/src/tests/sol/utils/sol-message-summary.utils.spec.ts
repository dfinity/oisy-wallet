import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type { SolSimulationPreview } from '$sol/types/sol-simulation';
import {
	deriveSolMessageSummary,
	solMessageMatchesSimulation
} from '$sol/utils/sol-message-summary.utils';
import { mockAtaAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { nonNullish } from '@dfinity/utils';

describe('sol-message-summary.utils', () => {
	const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
	const OTHER_MINT = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';

	const leg = ({
		kind,
		amount,
		tokenAddress
	}: {
		kind: 'send' | 'receive';
		amount: bigint;
		tokenAddress?: string;
	}): SolInstructionSummary => ({
		kind,
		amount,
		counterparty: mockSolAddress2,
		...(nonNullish(tokenAddress) && { tokenAddress, decimals: 6 })
	});

	const preview = (partial: Partial<SolSimulationPreview>): SolSimulationPreview => ({
		tokenDeltas: [],
		controlChanges: [],
		...partial
	});

	describe('deriveSolMessageSummary', () => {
		it('should read a plain SOL transfer as a send of that amount', () => {
			const result = deriveSolMessageSummary({
				instructions: [leg({ kind: 'send', amount: 1_000_000n })]
			});

			expect(result.kind).toBe('send');
			expect(result.spent?.delta).toBe(-1_000_000n);
			expect(result.counterparty).toBe(mockSolAddress2);
		});

		it('should read one mint out and another in as a swap of the pair', () => {
			const result = deriveSolMessageSummary({
				instructions: [
					leg({ kind: 'send', amount: 1_000_000n, tokenAddress: MINT }),
					leg({ kind: 'receive', amount: 2_000_000n, tokenAddress: OTHER_MINT })
				]
			});

			expect(result.kind).toBe('swap');
			expect(result.spent?.tokenAddress).toBe(MINT);
			expect(result.received?.tokenAddress).toBe(OTHER_MINT);
		});

		// The wallet still holds it, so nothing was spent: calling this a send would report a loss
		// the user never took.
		it('should not call a transfer between the user own accounts a send', () => {
			const result = deriveSolMessageSummary({
				instructions: [{ ...leg({ kind: 'send', amount: 1_000_000n }), own: true }]
			});

			expect(result.kind).not.toBe('send');
		});

		// A message OISY cannot reduce to one movement is the case the caller must not state.
		it('should call a message it cannot reduce other', () => {
			expect(
				deriveSolMessageSummary({
					instructions: [
						{ kind: 'approve', counterparty: mockSolAddress2, account: mockAtaAddress }
					]
				}).kind
			).toBe('other');
		});
	});

	describe('solMessageMatchesSimulation', () => {
		const summary = deriveSolMessageSummary({
			instructions: [leg({ kind: 'send', amount: 1_000_000n, tokenAddress: MINT })]
		});

		it('should agree when the run moves exactly what the message states', () => {
			expect(
				solMessageMatchesSimulation({
					summary,
					preview: preview({
						tokenDeltas: [
							{ account: mockAtaAddress, tokenAddress: MINT, decimals: 6, delta: -1_000_000n }
						]
					}),
					costs: 5_000n
				})
			).toBeTruthy();
		});

		// The whole point of the comparison: a message that reads as one transfer and empties a
		// second holding when it runs.
		it('should disagree when the run moves something the message never mentioned', () => {
			expect(
				solMessageMatchesSimulation({
					summary,
					preview: preview({
						tokenDeltas: [
							{ account: mockAtaAddress, tokenAddress: MINT, decimals: 6, delta: -1_000_000n },
							{ account: mockAtaAddress, tokenAddress: OTHER_MINT, decimals: 6, delta: -9_000_000n }
						]
					}),
					costs: 5_000n
				})
			).toBeFalsy();
		});

		it('should disagree when the run moves a different amount of the same mint', () => {
			expect(
				solMessageMatchesSimulation({
					summary,
					preview: preview({
						tokenDeltas: [
							{ account: mockAtaAddress, tokenAddress: MINT, decimals: 6, delta: -1_500_000n }
						]
					}),
					costs: 5_000n
				})
			).toBeFalsy();
		});

		// The simulated SOL balance carries the fee and the rent, which the message never states.
		it('should allow the simulated SOL to fall short by what the transaction costs', () => {
			expect(
				solMessageMatchesSimulation({
					summary: deriveSolMessageSummary({
						instructions: [leg({ kind: 'send', amount: 1_000_000n })]
					}),
					preview: preview({ solDelta: -1_005_000n }),
					costs: 5_000n
				})
			).toBeTruthy();
		});

		it('should disagree when the simulated SOL falls short by more than the costs', () => {
			expect(
				solMessageMatchesSimulation({
					summary: deriveSolMessageSummary({
						instructions: [leg({ kind: 'send', amount: 1_000_000n })]
					}),
					preview: preview({ solDelta: -1_050_000n }),
					costs: 5_000n
				})
			).toBeFalsy();
		});

		// An account handed to someone else keeps the balance it had, so the amounts agree while
		// the account itself is gone.
		it('should disagree when the run hands an account to someone else', () => {
			expect(
				solMessageMatchesSimulation({
					summary,
					preview: preview({
						tokenDeltas: [
							{ account: mockAtaAddress, tokenAddress: MINT, decimals: 6, delta: -1_000_000n }
						],
						controlChanges: [{ account: mockAtaAddress, field: 'owner', to: mockSolAddress2 }]
					}),
					costs: 5_000n
				})
			).toBeFalsy();
		});

		it('should disagree with a message it could not reduce', () => {
			expect(
				solMessageMatchesSimulation({
					summary: { kind: 'other' },
					preview: preview({ solDelta: -1_000n }),
					costs: 5_000n
				})
			).toBeFalsy();
		});
	});
});
