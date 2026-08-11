import { JUP_TOKEN } from '$env/tokens/tokens-spl/tokens.jup.env';
import { ZERO } from '$lib/constants/app.constants';
import type { MappedSolTransaction } from '$sol/types/sol-transaction';
import * as solInstructionsUtils from '$sol/utils/sol-instructions.utils';
import { mapSolTransactionMessage } from '$sol/utils/sol-transactions.utils';
import { bn1Bi, bn3Bi } from '$tests/mocks/balances.mock';
import { mockSolParsedTransactionMessage } from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3
} from '$tests/mocks/sol.mock';
import {
	AuthorityType,
	getBurnInstruction,
	getSetAuthorityInstruction,
	getTransferCheckedInstruction
} from '@solana-program/token';
import {
	getBurnInstruction as getToken2022BurnInstruction,
	getSetAuthorityInstruction as getToken2022SetAuthorityInstruction,
	getTransferCheckedInstruction as getToken2022TransferCheckedInstruction,
	AuthorityType as Token2022AuthorityType
} from '@solana-program/token-2022';
import { address, type TransactionMessage } from '@solana/kit';
import type { MockInstance } from 'vitest';

describe('sol-transactions.utils', () => {
	describe('mapSolTransactionMessage', () => {
		const [instruction1, instruction2, instruction3] = mockSolParsedTransactionMessage.instructions;
		const mockParams: TransactionMessage = {
			...mockSolParsedTransactionMessage,
			instructions: [instruction1, instruction2, instruction3]
		};

		let spyMapSolInstruction: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyMapSolInstruction = vi.spyOn(solInstructionsUtils, 'mapSolInstruction');
		});

		it('should map a sol transaction message', () => {
			expect(mapSolTransactionMessage(mockSolParsedTransactionMessage)).toStrictEqual({
				amount: 2044380n,
				unreviewed: true,
				destination: 'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
				payer: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q',
				source: '5Dqoon9MdWRgwmJ839FJ2ZTpTAcc1MMprZeNyaxpaV1Q'
			});
		});

		it('should handle empty instructions', () => {
			expect(
				mapSolTransactionMessage({ ...mockSolParsedTransactionMessage, instructions: [] })
			).toStrictEqual({ amount: undefined });

			expect(spyMapSolInstruction).not.toHaveBeenCalled();
		});

		it('should map a single instruction with full fields', () => {
			const expected: MappedSolTransaction = {
				amount: 125n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				payer: mockSolAddress3
			};

			spyMapSolInstruction.mockReturnValue(expected);

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1]
				})
			).toStrictEqual(expected);

			expect(spyMapSolInstruction).toHaveBeenCalledExactlyOnceWith(instruction1);
		});

		it('should sum amounts across multiple instructions', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: 100n })
				.mockReturnValueOnce({ amount: 250n })
				.mockReturnValueOnce({ amount: 50n });

			expect(mapSolTransactionMessage(mockParams)).toStrictEqual({ amount: 400n });

			expect(spyMapSolInstruction).toHaveBeenCalledTimes(3);
			expect(spyMapSolInstruction).toHaveBeenNthCalledWith(1, instruction1);
			expect(spyMapSolInstruction).toHaveBeenNthCalledWith(2, instruction2);
			expect(spyMapSolInstruction).toHaveBeenNthCalledWith(3, instruction3);
		});

		it('should propagate the tokenAddress of an SPL token instruction', () => {
			spyMapSolInstruction.mockReturnValueOnce({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				tokenAddress: mockSolAddress3
			});

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1]
				})
			).toStrictEqual({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				tokenAddress: mockSolAddress3
			});
		});

		it('should propagate the isApproval flag of an approval instruction', () => {
			spyMapSolInstruction.mockReturnValueOnce({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				isApproval: true
			});

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1]
				})
			).toStrictEqual({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				isApproval: true
			});
		});

		it('should flag a transaction as ambiguous when it bundles a transfer and an approval', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({
					amount: 100n,
					source: mockSolAddress,
					destination: mockSolAddress2,
					tokenAddress: mockSolAddress3
				})
				.mockReturnValueOnce({
					amount: ZERO,
					source: mockSolAddress,
					destination: mockSolAddress2,
					tokenAddress: mockSolAddress3,
					isApproval: true
				});

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2]
				})
			).toStrictEqual({
				amount: 100n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				tokenAddress: mockSolAddress3,
				isApproval: true,
				ambiguous: true
			});
		});

		it('should flag a transaction as ambiguous when it bundles different SPL mints', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: 1n, tokenAddress: mockSolAddress2 })
				.mockReturnValueOnce({ amount: 2n, tokenAddress: mockSolAddress3 });

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2]
				})
			).toStrictEqual(expect.objectContaining({ ambiguous: true }));
		});

		it('should flag a transaction as ambiguous when it mixes an SPL token with a native movement', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: 5n, tokenAddress: mockSolAddress2 })
				.mockReturnValueOnce({ amount: 10n });

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2]
				})
			).toStrictEqual(expect.objectContaining({ ambiguous: true }));
		});

		it('should not flag ignored setup instructions before a reviewed transfer as ambiguous', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: undefined })
				.mockReturnValueOnce({ amount: undefined })
				.mockReturnValueOnce({
					amount: 5100n,
					source: mockSolAddress,
					destination: mockSolAddress2
				});

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2, instruction3]
				})
			).toStrictEqual({
				amount: 5100n,
				source: mockSolAddress,
				destination: mockSolAddress2
			});
		});

		it('should surface an unreviewed instruction as a warning, not reject it', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({
					amount: 1n,
					source: mockSolAddress,
					destination: mockSolAddress2
				})
				.mockReturnValueOnce({ amount: undefined, unreviewed: true });

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2]
				})
			).toStrictEqual({
				amount: 1n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				unreviewed: true
			});
		});

		it('should surface a wholly unreviewed transaction as unreviewed without an amount', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: undefined, unreviewed: true })
				.mockReturnValueOnce({ amount: undefined, unreviewed: true });

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2]
				})
			).toStrictEqual({ amount: undefined, unreviewed: true });
		});

		it('should ignore instructions with undefined amount (no change to accumulator)', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: undefined })
				.mockReturnValueOnce({ amount: 5n })
				.mockReturnValueOnce({});

			expect(mapSolTransactionMessage(mockParams)).toStrictEqual({ amount: 5n });
		});

		it('should treat zero amounts correctly (sum remains accurate)', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: ZERO })
				.mockReturnValueOnce({ amount: 10n });

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2]
				})
			).toStrictEqual({ amount: 10n });
		});

		it('should handle negative amounts (deductions) as part of the sum', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: 200n })
				.mockReturnValueOnce({ amount: -50n });

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2]
				})
			).toStrictEqual({ amount: 150n });
		});

		it('should keep the first defined source/destination/payer and not overwrite with later undefineds', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({
					amount: 10n,
					source: mockSolAddress,
					destination: mockSolAddress2,
					payer: mockSolAddress3
				})
				.mockReturnValueOnce({
					amount: 20n,
					source: undefined,
					destination: undefined,
					payer: undefined
				})
				.mockReturnValueOnce({ amount: 30n });

			expect(mapSolTransactionMessage(mockParams)).toStrictEqual({
				amount: 60n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				payer: mockSolAddress3
			});
		});

		it('should flag a transaction as ambiguous when the source changes across instructions', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: bn1Bi })
				.mockReturnValueOnce({
					amount: bn1Bi,
					source: mockSolAddress,
					destination: mockSolAddress2,
					payer: mockSolAddress3
				})
				.mockReturnValueOnce({ amount: bn1Bi, source: mockAtaAddress });

			expect(mapSolTransactionMessage(mockParams)).toStrictEqual({
				amount: bn3Bi,
				source: mockAtaAddress,
				destination: mockSolAddress2,
				payer: mockSolAddress3,
				ambiguous: true
			});
		});

		it('should flag a transaction as ambiguous when the destination changes across instructions', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: bn1Bi })
				.mockReturnValueOnce({
					amount: bn1Bi,
					source: mockSolAddress,
					destination: mockSolAddress2,
					payer: mockSolAddress3
				})
				.mockReturnValueOnce({ amount: bn1Bi, destination: mockAtaAddress });

			expect(mapSolTransactionMessage(mockParams)).toStrictEqual({
				amount: bn3Bi,
				source: mockSolAddress,
				destination: mockAtaAddress,
				payer: mockSolAddress3,
				ambiguous: true
			});
		});

		it('should flag a transaction as ambiguous when the payer changes across instructions', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: bn1Bi })
				.mockReturnValueOnce({
					amount: bn1Bi,
					source: mockSolAddress,
					destination: mockSolAddress2,
					payer: mockSolAddress3
				})
				.mockReturnValueOnce({ amount: bn1Bi, payer: mockAtaAddress });

			expect(mapSolTransactionMessage(mockParams)).toStrictEqual({
				amount: bn3Bi,
				source: mockSolAddress,
				destination: mockSolAddress2,
				payer: mockAtaAddress,
				ambiguous: true
			});
		});

		it('should flag an attacker transfer hidden behind a benign trailing transfer as ambiguous', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: 9n, source: mockSolAddress, destination: mockSolAddress2 })
				.mockReturnValueOnce({ amount: 1n, source: mockSolAddress, destination: mockAtaAddress });

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2]
				})
			).toStrictEqual({
				amount: 10n,
				source: mockSolAddress,
				destination: mockAtaAddress,
				ambiguous: true
			});
		});

		it('should not flag repeated transfers to the same destination as ambiguous', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: 9n, source: mockSolAddress, destination: mockSolAddress2 })
				.mockReturnValueOnce({ amount: 1n, source: mockSolAddress, destination: mockSolAddress2 });

			expect(
				mapSolTransactionMessage({
					...mockSolParsedTransactionMessage,
					instructions: [instruction1, instruction2]
				})
			).toStrictEqual({
				amount: 10n,
				source: mockSolAddress,
				destination: mockSolAddress2
			});
		});

		it('should not crash if mapSolInstruction returns an object without fields', () => {
			spyMapSolInstruction.mockReturnValue({});

			expect(mapSolTransactionMessage(mockParams)).toStrictEqual({ amount: undefined });
		});

		describe('with a dust transfer hiding a takeover or a burn', () => {
			// These exercise the real instruction mapper end to end, which is the point: the attack
			// lives in how a decoded instruction is reduced, not in a stubbed verdict.
			beforeEach(() => {
				spyMapSolInstruction.mockRestore();
			});

			const dustTransfer = getTransferCheckedInstruction({
				source: address(mockAtaAddress),
				mint: address(JUP_TOKEN.address),
				destination: address(mockSolAddress2),
				authority: address(mockSolAddress),
				amount: 1n,
				decimals: 6
			});

			const token2022DustTransfer = getToken2022TransferCheckedInstruction({
				source: address(mockAtaAddress),
				mint: address(JUP_TOKEN.address),
				destination: address(mockSolAddress2),
				authority: address(mockSolAddress),
				amount: 1n,
				decimals: 6
			});

			it('should reject a `SetAuthority` handing the source account to an attacker', () => {
				const setAuthority = getSetAuthorityInstruction({
					owned: address(mockAtaAddress),
					owner: address(mockSolAddress),
					authorityType: AuthorityType.AccountOwner,
					newAuthority: address(mockSolAddress3)
				});

				expect(
					mapSolTransactionMessage({
						...mockSolParsedTransactionMessage,
						instructions: [dustTransfer, setAuthority]
					})
				).toStrictEqual(expect.objectContaining({ ambiguous: true }));
			});

			it('should reject a `Burn` of the balance the summary does not show', () => {
				const burn = getBurnInstruction({
					account: address(mockAtaAddress),
					mint: address(JUP_TOKEN.address),
					authority: address(mockSolAddress),
					amount: 1_000_000n
				});

				expect(
					mapSolTransactionMessage({
						...mockSolParsedTransactionMessage,
						instructions: [dustTransfer, burn]
					})
				).toStrictEqual(expect.objectContaining({ ambiguous: true }));
			});

			it('should reject a Token-2022 `SetAuthority` handing the source account to an attacker', () => {
				const setAuthority = getToken2022SetAuthorityInstruction({
					owned: address(mockAtaAddress),
					owner: address(mockSolAddress),
					authorityType: Token2022AuthorityType.AccountOwner,
					newAuthority: address(mockSolAddress3)
				});

				expect(
					mapSolTransactionMessage({
						...mockSolParsedTransactionMessage,
						instructions: [token2022DustTransfer, setAuthority]
					})
				).toStrictEqual(expect.objectContaining({ ambiguous: true }));
			});

			it('should reject a Token-2022 `Burn` of the balance the summary does not show', () => {
				const burn = getToken2022BurnInstruction({
					account: address(mockAtaAddress),
					mint: address(JUP_TOKEN.address),
					authority: address(mockSolAddress),
					amount: 1_000_000n
				});

				expect(
					mapSolTransactionMessage({
						...mockSolParsedTransactionMessage,
						instructions: [token2022DustTransfer, burn]
					})
				).toStrictEqual(expect.objectContaining({ ambiguous: true }));
			});

			it('should keep a lone dust transfer signable', () => {
				expect(
					mapSolTransactionMessage({
						...mockSolParsedTransactionMessage,
						instructions: [dustTransfer]
					})
				).toStrictEqual({
					amount: 1n,
					source: mockAtaAddress,
					destination: mockSolAddress2,
					tokenAddress: JUP_TOKEN.address
				});
			});
		});

		it('should correctly initialise sum from ZERO', () => {
			spyMapSolInstruction
				.mockReturnValueOnce({ amount: undefined })
				.mockReturnValueOnce({ amount: 42n })
				.mockReturnValueOnce({ amount: 18n });

			expect(mapSolTransactionMessage(mockParams)).toStrictEqual({
				amount: 60n
			});
		});
	});
});
