import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import {
	sanitizeSolSummary,
	toSolSignRequestSummaryFacts,
	toSolTransactionSummaryFacts
} from '$sol/utils/sol-summary.utils';
import { createMockSolTransactionUi } from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockSolAddress,
	mockSolAddress2,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

describe('sol-summary.utils', () => {
	const params = {
		token: SOLANA_TOKEN,
		feeToken: SOLANA_TOKEN,
		source: mockSolAddress,
		destination: mockSolAddress2,
		isApproval: false,
		unreviewed: false,
		networkFee: 5_000n,
		splTokens: []
	};

	describe('toSolSignRequestSummaryFacts', () => {
		it('should state the amount, the signer and the recipient of a decoded transfer', () => {
			const facts = toSolSignRequestSummaryFacts({ ...params, amount: 1_000_000n });

			expect(facts).toContain('Amount: 0.001 SOL');
			expect(facts).toContain('Signer: 7q6RDbn...EBmEMf1');
			expect(facts).toContain('Recipient: 4GsmSut...AM56JR8');
		});

		it('should state the fees the review shows', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 1_000_000n,
				prioritizationFee: 238_217n
			});

			expect(facts).toContain('Network fee: 0.000005 SOL');
			expect(facts).toContain('Priority fee: 0.000238217 SOL');
		});

		it('should omit the priority fee the review does not show', () => {
			const facts = toSolSignRequestSummaryFacts({ ...params, amount: 1_000_000n });

			expect(facts.join('\n')).not.toContain('Priority fee');
		});

		// The rows the review drops when the decode produced no amount are not sent either.
		it('should omit the amount and the recipient when the decode produced no amount', () => {
			const facts = toSolSignRequestSummaryFacts(params);

			expect(facts.join('\n')).not.toContain('Amount');
			expect(facts.join('\n')).not.toContain('Recipient');
			expect(facts).toContain('Network fee: 0.000005 SOL');
		});

		it('should call the destination a spender for an approval', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 1_000_000n,
				isApproval: true
			});

			expect(facts).toContain('Approved spender: 4GsmSut...AM56JR8');
			expect(facts.join('\n')).not.toContain('Recipient');
		});

		it('should state the simulated balance changes with their sign', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 1_000_000n,
				preview: {
					solDelta: -10_000_000n,
					tokenDeltas: [
						{
							account: mockAtaAddress,
							tokenAddress: mockSplAddress,
							decimals: 6,
							delta: 2_500_000n
						}
					],
					controlChanges: []
				}
			});

			expect(facts).toContain('Simulated balance change: -0.01 SOL');
			expect(facts).toContain('Simulated balance change: +2.5 CcExVbJ...rFRrbta');
		});

		it('should name a known SPL token by its symbol', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 1_000_000n,
				splTokens: [{ ...mockValidSplToken, version: undefined, enabled: true }],
				preview: {
					tokenDeltas: [
						{
							account: mockAtaAddress,
							tokenAddress: mockSplAddress,
							decimals: 6,
							delta: 2_500_000n
						}
					],
					controlChanges: []
				}
			});

			expect(facts).toContain(`Simulated balance change: +2.5 ${mockValidSplToken.symbol}`);
		});

		it('should state a simulated control change', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 1_000_000n,
				preview: {
					tokenDeltas: [],
					controlChanges: [{ account: mockAtaAddress, field: 'delegate' }]
				}
			});

			expect(facts).toContain(
				'Simulated control change: HoTxtcV...CJwLULd gets a new approved spender'
			);
		});

		// A partial decode of a routed swap reads the wrapping leg, whose recipient is a temporary
		// account owned by the signer. Quoting it states a transfer to an address the user never
		// chose, and omits the token they receive; the simulated balances state both correctly.
		it('should let the simulated balances replace a leg decoded out of a partial transaction', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 5_000_000n,
				unreviewed: true,
				preview: {
					solDelta: -5_454_491n,
					tokenDeltas: [
						{
							account: mockAtaAddress,
							tokenAddress: mockSplAddress,
							decimals: 6,
							delta: 377_098n
						}
					],
					controlChanges: []
				}
			});

			expect(facts.join('\n')).not.toContain('Amount');
			expect(facts.join('\n')).not.toContain('Recipient');

			expect(facts).toContain('Simulated balance change: -0.005454491 SOL');
			expect(facts).toContain('Simulated balance change: +0.377098 CcExVbJ...rFRrbta');
		});

		it('should keep the decoded transfer when the whole transaction was decoded', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 5_000_000n,
				preview: { solDelta: -5_454_491n, tokenDeltas: [], controlChanges: [] }
			});

			expect(facts).toContain('Amount: 0.005 SOL');
			expect(facts).toContain('Recipient: 4GsmSut...AM56JR8');
		});

		// A control change carries no amount, so it cannot stand in for the leg it would replace.
		it('should keep the decoded transfer when the simulation found no balance change', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 5_000_000n,
				unreviewed: true,
				preview: {
					tokenDeltas: [],
					controlChanges: [{ account: mockAtaAddress, field: 'delegate' }]
				}
			});

			expect(facts).toContain('Amount: 0.005 SOL');
			expect(facts).toContain('Recipient: 4GsmSut...AM56JR8');
		});

		it('should keep an approval the simulated balances do not restate', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 5_000_000n,
				isApproval: true,
				unreviewed: true,
				preview: { solDelta: -5_454_491n, tokenDeltas: [], controlChanges: [] }
			});

			expect(facts).toContain('Amount: 0.005 SOL');
			expect(facts).toContain('Approved spender: 4GsmSut...AM56JR8');
		});

		it('should state the unreviewed caveat the review warns about', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 1_000_000n,
				unreviewed: true
			});

			expect(facts.join('\n')).toContain('could not decode every instruction');
		});

		// Nothing the review has not derived may reach the model.
		it('should send neither full addresses nor anything but the derived facts', () => {
			const prompt = toSolSignRequestSummaryFacts({
				...params,
				amount: 1_000_000n,
				prioritizationFee: 238_217n,
				preview: {
					solDelta: -10_000_000n,
					tokenDeltas: [],
					controlChanges: [{ account: mockAtaAddress, field: 'owner' }]
				}
			}).join('\n');

			expect(prompt).not.toContain(mockSolAddress);
			expect(prompt).not.toContain(mockSolAddress2);
			expect(prompt).not.toContain(mockAtaAddress);

			expect(prompt.split('\n')).toStrictEqual([
				'Signer: 7q6RDbn...EBmEMf1',
				'Amount: 0.001 SOL',
				'Recipient: 4GsmSut...AM56JR8',
				'Network fee: 0.000005 SOL',
				'Priority fee: 0.000238217 SOL',
				'Simulated balance change: -0.01 SOL',
				'Simulated control change: HoTxtcV...CJwLULd gets a new account owner'
			]);
		});

		it('should drop whole facts rather than exceed the prompt budget', () => {
			const facts = toSolSignRequestSummaryFacts({
				...params,
				amount: 1_000_000n,
				preview: {
					tokenDeltas: Array.from({ length: 200 }, () => ({
						account: mockAtaAddress,
						tokenAddress: mockSplAddress,
						decimals: 6,
						delta: 2_500_000n
					})),
					controlChanges: []
				}
			});

			expect(facts.join('\n').length).toBeLessThanOrEqual(2_000);
			expect(facts.every((fact) => fact.length > 0)).toBeTruthy();
		});
	});

	describe('sanitizeSolSummary', () => {
		const facts = ['Amount: 0.001 SOL', 'Recipient: 4GsmSut...AM56JR8'];

		it('should return nothing for an absent response', () => {
			expect(sanitizeSolSummary({ facts })).toBeUndefined();
		});

		it('should return nothing for an empty response', () => {
			expect(sanitizeSolSummary({ content: '', facts })).toBeUndefined();
			expect(sanitizeSolSummary({ content: '   \n  ', facts })).toBeUndefined();
		});

		it('should return the sentence', () => {
			expect(
				sanitizeSolSummary({
					content: 'Transfer of 0.001 SOL to 4GsmSut...AM56JR8.',
					facts
				})
			).toBe('Transfer of 0.001 SOL to 4GsmSut...AM56JR8.');
		});

		it('should drop the model reasoning block', () => {
			expect(
				sanitizeSolSummary({
					content: '<think>the user wants a summary</think>\nTransfer of 0.001 SOL.',
					facts
				})
			).toBe('Transfer of 0.001 SOL.');
		});

		it('should keep only the first sentence', () => {
			expect(
				sanitizeSolSummary({
					content: 'Transfer of 0.001 SOL. Only sign this if you trust the app.',
					facts
				})
			).toBe('Transfer of 0.001 SOL.');
		});

		it('should keep an answer that never terminates its sentence', () => {
			expect(sanitizeSolSummary({ content: 'Transfer of 0.001 SOL', facts })).toBe(
				'Transfer of 0.001 SOL'
			);
		});

		it('should not mistake a decimal point for the end of the sentence', () => {
			expect(sanitizeSolSummary({ content: 'Transfer of 0.001 SOL.', facts })).toBe(
				'Transfer of 0.001 SOL.'
			);
		});

		// A model that answers with markup ignored the format it was given.
		it.each([
			'<b>Transfer</b> of 0.001 SOL.',
			'**Transfer** of 0.001 SOL.',
			'[Transfer](https://example.com) of 0.001 SOL.',
			'`Transfer` of 0.001 SOL.',
			'# Transfer of 0.001 SOL.',
			'<img src=x onerror=alert(1)>.'
		])('should return nothing for the markup response %s', (content) => {
			expect(sanitizeSolSummary({ content, facts })).toBeUndefined();
		});

		it('should return nothing for a figure the facts never contained', () => {
			expect(sanitizeSolSummary({ content: 'Transfer of 42.5 SOL.', facts })).toBeUndefined();
		});

		it('should return nothing for a response past the length bound', () => {
			expect(sanitizeSolSummary({ content: `${'a'.repeat(400)}.`, facts })).toBeUndefined();
		});

		it('should return nothing when the model declares the facts insufficient', () => {
			expect(sanitizeSolSummary({ content: 'UNKNOWN', facts })).toBeUndefined();
			expect(sanitizeSolSummary({ content: 'unknown.', facts })).toBeUndefined();
		});
	});

	describe('toSolTransactionSummaryFacts', () => {
		const transaction = createMockSolTransactionUi('tx-1');

		it('should state the direction, the amount and the counterparty of a send', () => {
			const facts = toSolTransactionSummaryFacts({
				token: SOLANA_TOKEN,
				transaction: { ...transaction, value: 5_000_000n, to: mockSolAddress2 }
			});

			expect(facts).toContain('Direction: sent from this wallet');
			expect(facts).toContain('Amount: 0.005 SOL');
			expect(facts).toContain('Recipient: 4GsmSut...AM56JR8');
		});

		it('should call the counterparty a sender for a receive', () => {
			const facts = toSolTransactionSummaryFacts({
				token: SOLANA_TOKEN,
				transaction: { ...transaction, type: 'receive', from: mockSolAddress2 }
			});

			expect(facts).toContain('Direction: received by this wallet');
			expect(facts).toContain('Sender: 4GsmSut...AM56JR8');
			expect(facts.join('\n')).not.toContain('Recipient');
		});

		// The modal shows the owner where it knows one, so the sentence must name the same address.
		it('should prefer the owner over the token account', () => {
			const facts = toSolTransactionSummaryFacts({
				token: SOLANA_TOKEN,
				transaction: { ...transaction, to: mockAtaAddress, toOwner: mockSolAddress2 }
			});

			expect(facts).toContain('Recipient: 4GsmSut...AM56JR8');
		});

		it('should state the status the modal shows', () => {
			const facts = toSolTransactionSummaryFacts({ token: SOLANA_TOKEN, transaction });

			expect(facts).toContain('Status: finalized');
		});

		// The modal has no fee and no block row, and the fee is in SOL while the transaction may be
		// an SPL one, so neither may be phrased.
		it('should send neither full addresses nor anything the modal does not show', () => {
			const prompt = toSolTransactionSummaryFacts({
				token: SOLANA_TOKEN,
				transaction: { ...transaction, value: 5_000_000n, fee: 5_000n, to: mockSolAddress2 }
			}).join('\n');

			expect(prompt).not.toContain(mockSolAddress2);
			expect(prompt).not.toContain('fee');
			expect(prompt).not.toContain('Block');

			expect(prompt.split('\n')).toStrictEqual([
				'Direction: sent from this wallet',
				'Amount: 0.005 SOL',
				'Recipient: 4GsmSut...AM56JR8',
				'Status: finalized'
			]);
		});
	});
});
