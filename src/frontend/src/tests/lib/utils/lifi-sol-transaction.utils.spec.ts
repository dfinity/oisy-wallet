import { WSOL_TOKEN } from '$env/tokens/tokens-spl/tokens.wsol.env';
import { ZERO } from '$lib/constants/app.constants';
import { LifiQuoteRejectedError } from '$lib/types/errors';
import {
	assertLifiSolInstructions,
	assertLifiSolSimulation,
	decodeJupiterRoute,
	jupiterRouteMinimum,
	lifiSolNetworkFee,
	token2022AccountSize,
	type LifiSolBinding,
	type LifiSolDerivedAccounts
} from '$lib/utils/lifi-sol-transaction.utils';
import {
	JUPITER_SHARED_ACCOUNTS_ROUTE_V2_DISCRIMINATOR,
	LIFI_SOLANA_FEE_PROGRAM,
	LIFI_SOLANA_FEE_WALLET
} from '$sol/constants/lifi.constants';
import {
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_2022_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { calculateAssociatedTokenAddress } from '$sol/services/spl-accounts.services';
import type { SolAddress } from '$sol/types/address';
import type { SolInstruction } from '$sol/types/sol-instructions';
import type { SolanaParsedAccountInfo } from '$sol/types/sol-rpc';
import type { SolSimulationPreview, SolSimulationResult } from '$sol/types/sol-simulation';
import { mapSolSimulationPreview } from '$sol/utils/sol-simulation.utils';
import {
	mockLifiSolSolToPyusd,
	mockLifiSolSolToUsdc,
	mockLifiSolSolToUsdcWithWsolAccount,
	mockLifiSolTransactionMessage,
	mockLifiSolUsdcToSol,
	mockLifiSolUsdcToUsdt,
	mockLifiSolUser,
	type LifiSolTransactionFixture
} from '$tests/mocks/lifi-sol-transaction.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockAtaAddress3,
	mockSolAddress2
} from '$tests/mocks/sol.mock';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { AccountRole, address, getBase16Encoder } from '@solana/kit';

const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const PYUSD = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo';

const bindingOf = ({
	request: { fromAddress, fromToken, toToken, fromAmount },
	toAmountMin
}: LifiSolTransactionFixture): LifiSolBinding => ({
	userAddress: fromAddress,
	fromToken,
	toToken,
	amount: BigInt(fromAmount),
	displayedToAmountMin: toAmountMin
});

const ataOf = ({
	owner,
	mint,
	tokenProgram = TOKEN_PROGRAM_ADDRESS
}: {
	owner: SolAddress;
	mint: SolAddress;
	tokenProgram?: SolAddress;
}): Promise<SolAddress> =>
	calculateAssociatedTokenAddress({
		owner,
		tokenAddress: mint,
		tokenOwnerAddress: tokenProgram
	});

const atasOf = async ({
	owner,
	mint
}: {
	owner: SolAddress;
	mint: SolAddress;
}): Promise<Partial<Record<SolAddress, SolAddress>>> => ({
	[TOKEN_PROGRAM_ADDRESS]: await ataOf({ owner, mint }),
	[TOKEN_2022_PROGRAM_ADDRESS]: await ataOf({
		owner,
		mint,
		tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
	})
});

const accountsOf = async ({
	request: { fromAddress, fromToken }
}: LifiSolTransactionFixture): Promise<LifiSolDerivedAccounts> => {
	const wrappedSolAccount = await ataOf({ owner: fromAddress, mint: WSOL_TOKEN.address });

	return fromToken === SYSTEM_PROGRAM_ADDRESS
		? {
				wrappedSolAccount,
				sourceTokenAccounts: { [TOKEN_PROGRAM_ADDRESS]: wrappedSolAccount },
				feeTokenAccounts: {}
			}
		: {
				wrappedSolAccount,
				sourceTokenAccounts: await atasOf({ owner: fromAddress, mint: fromToken }),
				feeTokenAccounts: await atasOf({ owner: LIFI_SOLANA_FEE_WALLET, mint: fromToken })
			};
};

const instructionsOf = (fixture: LifiSolTransactionFixture): SolInstruction[] => [
	...mockLifiSolTransactionMessage(fixture).instructions
];

const withData = ({
	instruction,
	edit
}: {
	instruction: SolInstruction;
	edit: (data: { view: DataView; bytes: Uint8Array }) => void;
}): SolInstruction => {
	const bytes = new Uint8Array(instruction.data ?? []);

	edit({ view: new DataView(bytes.buffer), bytes });

	return { ...instruction, data: bytes };
};

const withAccount = ({
	instruction,
	index,
	account
}: {
	instruction: SolInstruction;
	index: number;
	account: SolAddress;
}): SolInstruction => ({
	...instruction,
	accounts: (instruction.accounts ?? []).map((meta, metaIndex) =>
		metaIndex === index ? { ...meta, address: address(account) } : meta
	)
});

const replaceAt = ({
	instructions,
	index,
	instruction
}: {
	instructions: SolInstruction[];
	index: number;
	instruction: SolInstruction;
}): SolInstruction[] => instructions.map((current, i) => (i === index ? instruction : current));

const indexOf = ({
	instructions,
	programAddress,
	nth = 0
}: {
	instructions: SolInstruction[];
	programAddress: SolAddress;
	nth?: number;
}): number => {
	const indexes = instructions.flatMap((instruction, index) =>
		instruction.programAddress === programAddress ? [index] : []
	);
	const index = indexes[nth];

	assertNonNullish(index);

	return index;
};

const JUPITER = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

// The route's input, the first argument of `route_v2`.
const withRouteInput = ({
	instructions,
	inAmount
}: {
	instructions: SolInstruction[];
	inAmount: bigint;
}): SolInstruction[] => {
	const index = indexOf({ instructions, programAddress: JUPITER });
	const route = instructions[index];

	assertNonNullish(route);

	return replaceAt({
		instructions,
		index,
		instruction: withData({
			instruction: route,
			edit: ({ view }) => view.setBigUint64(8, inAmount, true)
		})
	});
};
const COMPUTE_BUDGET = 'ComputeBudget111111111111111111111111111111';
const ATA_PROGRAM = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

const instructionAt = ({
	instructions,
	programAddress,
	nth
}: {
	instructions: SolInstruction[];
	programAddress: SolAddress;
	nth?: number;
}): SolInstruction => {
	const instruction = instructions[indexOf({ instructions, programAddress, nth })];

	assertNonNullish(instruction);

	return instruction;
};

describe('lifi-sol-transaction.utils', () => {
	beforeAll(() => {
		// The derivation of associated token accounts hashes, which the kit refuses outside a secure
		// context.
		vi.stubGlobal('isSecureContext', true);
	});

	afterAll(() => {
		vi.unstubAllGlobals();
	});

	describe('decodeJupiterRoute', () => {
		it("should decode the arguments of a LI.FI transaction's route_v2", () => {
			const route = instructionAt({
				instructions: instructionsOf(mockLifiSolSolToUsdc),
				programAddress: JUPITER
			});

			assertNonNullish(route.data);

			expect(decodeJupiterRoute(route.data)).toEqual({
				inAmount: 99_750_000n,
				quotedOutAmount: 10_390_499n,
				slippageBps: 50,
				platformFeeBps: 0,
				positiveSlippageBps: 0
			});
		});

		it('should decode shared_accounts_route_v2, whose arguments follow an id', () => {
			const route = instructionAt({
				instructions: instructionsOf(mockLifiSolSolToUsdc),
				programAddress: JUPITER
			});

			assertNonNullish(route.data);

			const data = new Uint8Array([
				...getBase16Encoder().encode(JUPITER_SHARED_ACCOUNTS_ROUTE_V2_DISCRIMINATOR),
				7,
				...route.data.slice(8)
			]);

			expect(decodeJupiterRoute(data)?.quotedOutAmount).toBe(10_390_499n);
		});

		it('should not decode any other instruction', () => {
			expect(decodeJupiterRoute(new Uint8Array(40))).toBeUndefined();
		});

		it('should not decode data too short for the arguments and the route plan length', () => {
			const route = instructionAt({
				instructions: instructionsOf(mockLifiSolSolToUsdc),
				programAddress: JUPITER
			});

			assertNonNullish(route.data);

			expect(decodeJupiterRoute(route.data.slice(0, 34))).toEqual(
				expect.objectContaining({ inAmount: 99_750_000n })
			);
			expect(decodeJupiterRoute(route.data.slice(0, 33))).toBeUndefined();
		});
	});

	describe('jupiterRouteMinimum', () => {
		// 10,390,499 × 0.995 = 10,338,546.505, which LI.FI displays as 10,338,547.
		it('should round to the nearest unit, as LI.FI does', () => {
			expect(jupiterRouteMinimum({ quotedOutAmount: 10_390_499n, slippageBps: 50 })).toBe(
				10_338_547n
			);
		});

		it('should round a fraction below one half down', () => {
			// 191,515,998 × 0.995 = 190,558,418.01
			expect(jupiterRouteMinimum({ quotedOutAmount: 191_515_998n, slippageBps: 50 })).toBe(
				190_558_418n
			);
		});

		it('should round exactly one half up', () => {
			expect(jupiterRouteMinimum({ quotedOutAmount: 1n, slippageBps: 5_000 })).toBe(1n);
		});
	});

	describe('lifiSolNetworkFee', () => {
		// LI.FI's own SEND gas cost for this compute budget (2026-10-22).
		it('should price the compute budget, rounded up, plus the base fee of each signature', () => {
			expect(
				lifiSolNetworkFee({
					computeUnitLimit: 435_534n,
					computeUnitPrice: 299_999n,
					signatures: 1,
					instructionsCount: 10
				})
			).toBe(135_660n);
		});

		it('should charge only the base fee without a compute unit price', () => {
			expect(
				lifiSolNetworkFee({ computeUnitLimit: 435_534n, signatures: 2, instructionsCount: 10 })
			).toBe(10_000n);
		});

		it('should price no more than the network-wide compute unit limit', () => {
			expect(
				lifiSolNetworkFee({
					computeUnitLimit: 2_000_000n,
					computeUnitPrice: 1_000_000n,
					signatures: 1,
					instructionsCount: 10
				})
			).toBe(1_405_000n);
		});
	});

	describe('token2022AccountSize', () => {
		it('should size an account of a mint without extensions with ImmutableOwner alone', () => {
			expect(token2022AccountSize([])).toBe(170n);
		});

		it('should add the account extension a transfer-fee mint requires', () => {
			expect(token2022AccountSize(['TransferFeeConfig'])).toBe(182n);
		});

		// Both checked against accounts on chain (2026-10-22 and 2026-10-23).
		it.each([
			{
				token: 'PYUSD',
				extensions: [
					'MintCloseAuthority',
					'PermanentDelegate',
					'TransferFeeConfig',
					'ConfidentialTransferMint',
					'ConfidentialTransferFee',
					'TransferHook',
					'MetadataPointer',
					'TokenMetadata'
				] as const,
				size: 187n
			},
			{
				token: 'AAPLx',
				extensions: [
					'MetadataPointer',
					'PermanentDelegate',
					'DefaultAccountState',
					'ScaledUiAmountConfig',
					'PausableConfig',
					'ConfidentialTransferMint',
					'TransferHook',
					'TokenMetadata'
				] as const,
				size: 179n
			}
		])('should size an account of $token as on chain', ({ extensions, size }) => {
			expect(token2022AccountSize([...extensions])).toBe(size);
		});

		it.each(['NonTransferable', 'TransferHook', 'PausableConfig'] as const)(
			'should add the account extension %s requires',
			(extension) => {
				expect(token2022AccountSize([extension])).toBeGreaterThan(170n);
			}
		);

		it.each([
			'MintCloseAuthority',
			'ConfidentialTransferMint',
			'DefaultAccountState',
			'InterestBearingConfig',
			'PermanentDelegate',
			'ConfidentialTransferFee',
			'MetadataPointer',
			'TokenMetadata',
			'GroupPointer',
			'TokenGroup',
			'GroupMemberPointer',
			'TokenGroupMember',
			'ConfidentialMintBurn',
			'ScaledUiAmountConfig'
		] as const)('should add nothing for %s', (extension) => {
			expect(token2022AccountSize([extension])).toBe(170n);
		});

		it.each(['PermissionedBurn', 'ImmutableOwner', 'Uninitialized'] as const)(
			'should not size an account of a mint with %s, which neither list places',
			(extension) => {
				expect(token2022AccountSize(['TransferFeeConfig', extension])).toBeUndefined();
			}
		);
	});

	describe('assertLifiSolInstructions', () => {
		const assertWith = async ({
			fixture,
			instructions = instructionsOf(fixture),
			binding = bindingOf(fixture)
		}: {
			fixture: LifiSolTransactionFixture;
			instructions?: SolInstruction[];
			binding?: LifiSolBinding;
		}) => assertLifiSolInstructions({ instructions, binding, accounts: await accountsOf(fixture) });

		const expectRejected = async (params: Parameters<typeof assertWith>[0]) =>
			await expect(assertWith(params)).rejects.toThrow(LifiQuoteRejectedError);

		describe('on real LI.FI transactions', () => {
			it('should accept SOL → USDC through a temporary wrapped SOL account', async () => {
				const wrappedSolAccount = await ataOf({
					owner: mockLifiSolUser,
					mint: WSOL_TOKEN.address
				});

				await expect(assertWith({ fixture: mockLifiSolSolToUsdc })).resolves.toEqual({
					computeUnitLimit: 1_400_000n,
					computeUnitPrice: 263_157n,
					createdAccounts: [
						{
							account: wrappedSolAccount,
							mint: WSOL_TOKEN.address,
							tokenProgram: TOKEN_PROGRAM_ADDRESS
						},
						{
							account: await ataOf({ owner: mockLifiSolUser, mint: USDC }),
							mint: USDC,
							tokenProgram: TOKEN_PROGRAM_ADDRESS
						}
					]
				});
			});

			it('should accept USDC → SOL, its fee paid in USDC', async () => {
				await expect(assertWith({ fixture: mockLifiSolUsdcToSol })).resolves.toEqual(
					expect.objectContaining({
						createdAccounts: [expect.objectContaining({ mint: WSOL_TOKEN.address })]
					})
				);
			});

			// Whether that account held wrapped SOL only the simulation says.
			it("should accept a route closing the user's own wrapped SOL account", async () => {
				await expect(assertWith({ fixture: mockLifiSolSolToUsdcWithWsolAccount })).resolves.toEqual(
					expect.objectContaining({ createdAccounts: [] })
				);
			});

			it('should accept SOL → PYUSD, creating its account under Token-2022', async () => {
				await expect(assertWith({ fixture: mockLifiSolSolToPyusd })).resolves.toEqual(
					expect.objectContaining({
						createdAccounts: expect.arrayContaining([
							{
								account: await ataOf({
									owner: mockLifiSolUser,
									mint: PYUSD,
									tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
								}),
								mint: PYUSD,
								tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
							}
						])
					})
				);
			});

			it('should accept USDC → USDT, with no wrapped SOL at all', async () => {
				await expect(assertWith({ fixture: mockLifiSolUsdcToUsdt })).resolves.toEqual(
					expect.objectContaining({ computeUnitLimit: 1_400_000n })
				);
			});

			it('should accept a route without a compute unit price', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc).filter(
					({ data, programAddress }) => !(programAddress === COMPUTE_BUDGET && data?.[0] === 3)
				);

				const result = await assertWith({ fixture: mockLifiSolSolToUsdc, instructions });

				expect(result.computeUnitPrice).toBeUndefined();
			});

			it('should accept a route without a fee transfer or a fee instruction', async () => {
				const instructions = instructionsOf(mockLifiSolUsdcToUsdt).filter(
					({ programAddress }) =>
						programAddress !== LIFI_SOLANA_FEE_PROGRAM && programAddress !== TOKEN_PROGRAM_ADDRESS
				);

				await expect(
					assertWith({ fixture: mockLifiSolUsdcToUsdt, instructions })
				).resolves.toBeDefined();
			});
		});

		it('should refuse an instruction of a program a route does not call', async () => {
			const instructions = instructionsOf(mockLifiSolSolToUsdc);
			const route = instructionAt({ instructions, programAddress: JUPITER });

			await expectRejected({
				fixture: mockLifiSolSolToUsdc,
				instructions: [
					...instructions,
					{ ...route, programAddress: address('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc') }
				]
			});
		});

		it('should refuse an instruction a pinned program has but a route does not use', async () => {
			const instructions = instructionsOf(mockLifiSolSolToUsdc);
			const close = instructionAt({ instructions, programAddress: TOKEN_PROGRAM_ADDRESS, nth: 1 });

			// `Revoke` on the same accounts.
			await expectRejected({
				fixture: mockLifiSolSolToUsdc,
				instructions: [
					...instructions,
					withData({ instruction: close, edit: ({ bytes }) => bytes.set([5]) })
				]
			});
		});

		it('should refuse an instruction that does not decode', async () => {
			const instructions = instructionsOf(mockLifiSolSolToUsdc);
			const close = instructionAt({ instructions, programAddress: TOKEN_PROGRAM_ADDRESS, nth: 1 });

			await expectRejected({
				fixture: mockLifiSolSolToUsdc,
				instructions: [...instructions, { ...close, data: new Uint8Array([200]) }]
			});
		});

		describe('compute budget', () => {
			const limitIndex = 0;

			it('should refuse a transaction without a compute unit limit', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: instructionsOf(mockLifiSolSolToUsdc).slice(limitIndex + 1)
				});
			});

			it('should refuse a second compute unit limit', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const limit = instructions[limitIndex];

				assertNonNullish(limit);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: [...instructions, limit]
				});
			});

			it('should refuse a second compute unit price', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const price = instructions[limitIndex + 1];

				assertNonNullish(price);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: [...instructions, price]
				});
			});

			it.each([
				{ instructionName: 'a compute unit limit', index: 0 },
				{ instructionName: 'a compute unit price', index: 1 }
			])('should refuse $instructionName with trailing data', async ({ index }) => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const instruction = instructions[index];

				assertNonNullish(instruction);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({
						instructions,
						index,
						instruction: {
							...instruction,
							data: new Uint8Array([...(instruction.data ?? []), 0])
						}
					})
				});
			});

			it('should refuse a compute budget instruction with an account', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const limit = instructions[limitIndex];

				assertNonNullish(limit);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({
						instructions,
						index: limitIndex,
						instruction: {
							...limit,
							accounts: [{ address: address(mockLifiSolUser), role: AccountRole.WRITABLE }]
						}
					})
				});
			});

			it('should refuse any other compute budget instruction', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);

				// `RequestHeapFrame` of 256 KiB.
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: [
						...instructions,
						{
							programAddress: address(COMPUTE_BUDGET),
							data: new Uint8Array([1, 0, 0, 4, 0])
						}
					]
				});
			});
		});

		describe("LI.FI's fee", () => {
			const feeProgramOf = (instructions: SolInstruction[]) =>
				instructionAt({ instructions, programAddress: LIFI_SOLANA_FEE_PROGRAM });

			it('should refuse a second instruction of the fee program', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: [...instructions, feeProgramOf(instructions)]
				});
			});

			it.each([
				{
					change: 'another discriminator',
					edit: (data: Uint8Array) => new Uint8Array([1, ...data.slice(1)])
				},
				{ change: 'more data', edit: (data: Uint8Array) => new Uint8Array([...data, 0]) }
			])('should refuse the fee program with $change', async ({ edit }) => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const feeProgram = feeProgramOf(instructions);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({
						instructions,
						index: indexOf({ instructions, programAddress: LIFI_SOLANA_FEE_PROGRAM }),
						instruction: { ...feeProgram, data: edit(new Uint8Array(feeProgram.data ?? [])) }
					})
				});
			});

			it.each([0, 1])(
				"should refuse the fee program naming another account, the user's, at %s",
				async (index) => {
					const instructions = instructionsOf(mockLifiSolSolToUsdc);

					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: replaceAt({
							instructions,
							index: indexOf({ instructions, programAddress: LIFI_SOLANA_FEE_PROGRAM }),
							instruction: withAccount({
								instruction: feeProgramOf(instructions),
								index,
								account: mockLifiSolUser
							})
						})
					});
				}
			);

			it('should refuse the fee program with its first account only', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const feeProgram = feeProgramOf(instructions);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({
						instructions,
						index: indexOf({ instructions, programAddress: LIFI_SOLANA_FEE_PROGRAM }),
						instruction: { ...feeProgram, accounts: (feeProgram.accounts ?? []).slice(0, 1) }
					})
				});
			});

			it('should refuse the fee program with one more account', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const feeProgram = feeProgramOf(instructions);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({
						instructions,
						index: indexOf({ instructions, programAddress: LIFI_SOLANA_FEE_PROGRAM }),
						instruction: {
							...feeProgram,
							accounts: [
								...(feeProgram.accounts ?? []),
								{ address: address(mockLifiSolUser), role: AccountRole.WRITABLE }
							]
						}
					})
				});
			});

			describe('in SOL', () => {
				const feeTransferIndex = (instructions: SolInstruction[]) =>
					indexOf({ instructions, programAddress: SYSTEM_PROGRAM_ADDRESS });

				const withFee = (amount: bigint) => {
					const instructions = instructionsOf(mockLifiSolSolToUsdc);
					const index = feeTransferIndex(instructions);
					const transfer = instructions[index];

					assertNonNullish(transfer);

					return replaceAt({
						instructions,
						index,
						instruction: withData({
							instruction: transfer,
							edit: ({ view }) => view.setBigUint64(4, amount, true)
						})
					});
				};

				// The route's input shrinks by as much, so the amount still covers both.
				it("should refuse a fee above LI.FI's 25 bps", async () => {
					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: withRouteInput({
							instructions: withFee(250_001n),
							inAmount: 99_749_999n
						})
					});
				});

				it('should refuse a transfer with trailing data', async () => {
					const instructions = instructionsOf(mockLifiSolSolToUsdc);
					const index = feeTransferIndex(instructions);
					const transfer = instructions[index];

					assertNonNullish(transfer);

					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: replaceAt({
							instructions,
							index,
							instruction: { ...transfer, data: new Uint8Array([...(transfer.data ?? []), 0]) }
						})
					});
				});

				it('should refuse a second fee transfer', async () => {
					const instructions = instructionsOf(mockLifiSolSolToUsdc);
					const transfer = instructions[feeTransferIndex(instructions)];

					assertNonNullish(transfer);

					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: [
							...instructions,
							withData({
								instruction: transfer,
								edit: ({ view }) => view.setBigUint64(4, 1n, true)
							})
						]
					});
				});

				it('should refuse a transfer to anyone else', async () => {
					const instructions = instructionsOf(mockLifiSolSolToUsdc);
					const index = feeTransferIndex(instructions);
					const transfer = instructions[index];

					assertNonNullish(transfer);

					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: replaceAt({
							instructions,
							index,
							instruction: withAccount({
								instruction: transfer,
								index: 1,
								account: mockSolAddress2
							})
						})
					});
				});

				it('should refuse a transfer from anyone else', async () => {
					const instructions = instructionsOf(mockLifiSolSolToUsdc);
					const index = feeTransferIndex(instructions);
					const transfer = instructions[index];

					assertNonNullish(transfer);

					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: replaceAt({
							instructions,
							index,
							instruction: withAccount({
								instruction: transfer,
								index: 0,
								account: mockSolAddress2
							})
						})
					});
				});

				it('should refuse a fee in SOL from an SPL source', async () => {
					const transfer = withData({
						instruction: instructionAt({
							instructions: instructionsOf(mockLifiSolSolToUsdc),
							programAddress: SYSTEM_PROGRAM_ADDRESS
						}),
						edit: ({ view }) => view.setBigUint64(4, 1n, true)
					});

					const instructions = instructionsOf(mockLifiSolUsdcToSol).filter(
						({ programAddress }) => programAddress !== TOKEN_PROGRAM_ADDRESS
					);

					await expectRejected({
						fixture: mockLifiSolUsdcToSol,
						instructions: [...instructions, transfer]
					});
				});

				it('should refuse another System instruction', async () => {
					const instructions = instructionsOf(mockLifiSolSolToUsdc);
					const transfer = instructions[feeTransferIndex(instructions)];

					assertNonNullish(transfer);

					// `Assign`.
					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: [
							...instructions,
							withData({ instruction: transfer, edit: ({ view }) => view.setUint32(0, 1, true) })
						]
					});
				});
			});

			describe('in the source token', () => {
				const feeTransferIndex = (instructions: SolInstruction[]) =>
					indexOf({ instructions, programAddress: TOKEN_PROGRAM_ADDRESS });

				const withTransfer = (edit: (instruction: SolInstruction) => SolInstruction) => {
					const instructions = instructionsOf(mockLifiSolUsdcToSol);
					const index = feeTransferIndex(instructions);
					const transfer = instructions[index];

					assertNonNullish(transfer);

					return replaceAt({ instructions, index, instruction: edit(transfer) });
				};

				// The route's input shrinks by as much, so the amount still covers both.
				it("should refuse a fee above LI.FI's 25 bps", async () => {
					await expectRejected({
						fixture: mockLifiSolUsdcToSol,
						instructions: withRouteInput({
							instructions: withTransfer((instruction) =>
								withData({ instruction, edit: ({ view }) => view.setBigUint64(1, 50_001n, true) })
							),
							inAmount: 19_949_999n
						})
					});
				});

				it.each([
					{ transfer: 'to an account other than the fee wallet', index: 2 },
					{ transfer: 'of another mint', index: 1 },
					{ transfer: 'by anyone but the user', index: 3 }
				])('should refuse a transfer $transfer', async ({ index }) => {
					await expectRejected({
						fixture: mockLifiSolUsdcToSol,
						instructions: withTransfer((instruction) =>
							withAccount({ instruction, index, account: mockSolAddress2 })
						)
					});
				});

				it('should refuse a transfer with an extra signer account', async () => {
					await expectRejected({
						fixture: mockLifiSolUsdcToSol,
						instructions: withTransfer((instruction) => ({
							...instruction,
							accounts: [
								...(instruction.accounts ?? []),
								{ address: address(mockSolAddress2), role: AccountRole.READONLY_SIGNER }
							]
						}))
					});
				});

				// The fee wallet's account under Token-2022 is another address.
				it('should refuse the transfer under the other token program', async () => {
					await expectRejected({
						fixture: mockLifiSolUsdcToSol,
						instructions: withTransfer((instruction) => ({
							...instruction,
							programAddress: address(TOKEN_2022_PROGRAM_ADDRESS)
						}))
					});
				});

				it('should accept the transfer under Token-2022 to its own fee account', async () => {
					const feeAccount = await ataOf({
						owner: LIFI_SOLANA_FEE_WALLET,
						mint: USDC,
						tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
					});

					await expect(
						assertWith({
							fixture: mockLifiSolUsdcToSol,
							instructions: withTransfer((instruction) => ({
								...withAccount({ instruction, index: 2, account: feeAccount }),
								programAddress: address(TOKEN_2022_PROGRAM_ADDRESS)
							}))
						})
					).resolves.toBeDefined();
				});

				it('should refuse another Token-2022 instruction', async () => {
					await expectRejected({
						fixture: mockLifiSolUsdcToSol,
						instructions: withTransfer((instruction) => ({
							...withData({ instruction, edit: ({ bytes }) => bytes.set([3]) }),
							programAddress: address(TOKEN_2022_PROGRAM_ADDRESS)
						}))
					});
				});
			});
		});

		describe('associated token accounts', () => {
			const withCreate = ({
				fixture = mockLifiSolSolToUsdc,
				edit
			}: {
				fixture?: LifiSolTransactionFixture;
				edit: (instruction: SolInstruction) => SolInstruction;
			}) => {
				const instructions = instructionsOf(fixture);
				const index = indexOf({ instructions, programAddress: ATA_PROGRAM, nth: 1 });
				const create = instructions[index];

				assertNonNullish(create);

				return replaceAt({ instructions, index, instruction: edit(create) });
			};

			it.each([
				{ creation: 'paid by anyone but the user', index: 0 },
				{ creation: 'for anyone but the user', index: 2 },
				{ creation: 'with another system program', index: 4 },
				{ creation: 'under a program that is not a token program', index: 5 }
			])('should refuse a creation $creation', async ({ index }) => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withCreate({
						edit: (instruction) => withAccount({ instruction, index, account: mockSolAddress2 })
					})
				});
			});

			it('should refuse a non-idempotent creation', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withCreate({
						edit: (instruction) => withData({ instruction, edit: ({ bytes }) => bytes.set([0]) })
					})
				});
			});

			it('should refuse a creation with an extra account', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withCreate({
						edit: (instruction) => ({
							...instruction,
							accounts: [
								...(instruction.accounts ?? []),
								{ address: address(mockSolAddress2), role: AccountRole.WRITABLE }
							]
						})
					})
				});
			});
		});

		describe('wrapped SOL', () => {
			it('should refuse a transfer into any other account of the user', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const index = indexOf({ instructions, programAddress: SYSTEM_PROGRAM_ADDRESS, nth: 1 });
				const transfer = instructions[index];

				assertNonNullish(transfer);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({
						instructions,
						index,
						instruction: withAccount({
							instruction: transfer,
							index: 1,
							account: await ataOf({ owner: mockLifiSolUser, mint: USDC })
						})
					})
				});
			});

			it('should refuse a sync of any other account', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const index = indexOf({ instructions, programAddress: TOKEN_PROGRAM_ADDRESS });
				const sync = instructions[index];

				assertNonNullish(sync);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({
						instructions,
						index,
						instruction: withAccount({ instruction: sync, index: 0, account: mockSolAddress2 })
					})
				});
			});

			it('should refuse a sync naming another account too', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const index = indexOf({ instructions, programAddress: TOKEN_PROGRAM_ADDRESS });
				const sync = instructions[index];

				assertNonNullish(sync);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({
						instructions,
						index,
						instruction: {
							...sync,
							accounts: [
								...(sync.accounts ?? []),
								{ address: address(mockSolAddress2), role: AccountRole.WRITABLE }
							]
						}
					})
				});
			});
		});

		describe('closes', () => {
			const withClose = ({
				fixture,
				index,
				account
			}: {
				fixture: LifiSolTransactionFixture;
				index: number;
				account: SolAddress;
			}) => {
				const instructions = instructionsOf(fixture);
				const closeIndex = instructions.length - 1;
				const close = instructions[closeIndex];

				assertNonNullish(close);

				return replaceAt({
					instructions,
					index: closeIndex,
					instruction: withAccount({ instruction: close, index, account })
				});
			};

			it('should refuse a close paying anyone but the user', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withClose({
						fixture: mockLifiSolSolToUsdc,
						index: 1,
						account: mockSolAddress2
					})
				});
			});

			// A multisig owner's signers follow the three accounts.
			it('should refuse a close with an extra signer account', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const closeIndex = instructions.length - 1;
				const close = instructions[closeIndex];

				assertNonNullish(close);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({
						instructions,
						index: closeIndex,
						instruction: {
							...close,
							accounts: [
								...(close.accounts ?? []),
								{ address: address(mockSolAddress2), role: AccountRole.READONLY_SIGNER }
							]
						}
					})
				});
			});

			it('should refuse a close the user does not sign for', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withClose({
						fixture: mockLifiSolSolToUsdc,
						index: 2,
						account: mockSolAddress2
					})
				});
			});

			it('should accept a close of another account the transaction creates', async () => {
				await expect(
					assertWith({
						fixture: mockLifiSolSolToUsdc,
						instructions: withClose({
							fixture: mockLifiSolSolToUsdc,
							index: 0,
							account: await ataOf({ owner: mockLifiSolUser, mint: USDC })
						})
					})
				).resolves.toBeDefined();
			});

			it('should refuse a close of an account the transaction does not create', async () => {
				await expectRejected({
					fixture: mockLifiSolUsdcToSol,
					instructions: withClose({
						fixture: mockLifiSolUsdcToSol,
						index: 0,
						account: await ataOf({ owner: mockLifiSolUser, mint: USDC })
					})
				});
			});
		});

		describe('route', () => {
			const withRoute = ({
				fixture = mockLifiSolSolToUsdc,
				edit
			}: {
				fixture?: LifiSolTransactionFixture;
				edit: (data: { view: DataView; bytes: Uint8Array }) => void;
			}) => {
				const instructions = instructionsOf(fixture);
				const index = indexOf({ instructions, programAddress: JUPITER });
				const route = instructions[index];

				assertNonNullish(route);

				return replaceAt({
					instructions,
					index,
					instruction: withData({ instruction: route, edit })
				});
			};

			it('should refuse a transaction without a route', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: instructionsOf(mockLifiSolSolToUsdc).filter(
						({ programAddress }) => programAddress !== JUPITER
					)
				});
			});

			it('should refuse a second route', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: [...instructions, instructionAt({ instructions, programAddress: JUPITER })]
				});
			});

			it('should refuse another Jupiter instruction', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withRoute({ edit: ({ bytes }) => bytes.set([0], 0) })
				});
			});

			it('should refuse a Jupiter instruction without data', async () => {
				const instructions = instructionsOf(mockLifiSolSolToUsdc);
				const index = indexOf({ instructions, programAddress: JUPITER });
				const { data: _, ...route } = instructionAt({ instructions, programAddress: JUPITER });

				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: replaceAt({ instructions, index, instruction: route })
				});
			});

			it('should refuse a platform fee', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withRoute({ edit: ({ view }) => view.setUint16(26, 1, true) })
				});
			});

			it('should refuse a positive slippage share', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withRoute({ edit: ({ view }) => view.setUint16(28, 1, true) })
				});
			});

			it('should refuse an on-chain minimum below the one displayed', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					binding: {
						...bindingOf(mockLifiSolSolToUsdc),
						displayedToAmountMin: mockLifiSolSolToUsdc.toAmountMin + 1n
					}
				});
			});

			it('should refuse a slippage above 100 %', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withRoute({
						edit: ({ view }) => {
							view.setUint16(24, 10_001, true);
							view.setBigUint64(16, 2n ** 64n - 1n, true);
						}
					}),
					binding: { ...bindingOf(mockLifiSolSolToUsdc), displayedToAmountMin: 1n }
				});
			});

			// The route's input and the fee add up to exactly the amount.
			it('should refuse a route spending more than the amount less the fee', async () => {
				await expectRejected({
					fixture: mockLifiSolSolToUsdc,
					instructions: withRouteInput({
						instructions: instructionsOf(mockLifiSolSolToUsdc),
						inAmount: 99_750_001n
					})
				});
			});

			describe('accounts', () => {
				const withRouteAccounts = ({
					fixture = mockLifiSolSolToUsdc,
					edit
				}: {
					fixture?: LifiSolTransactionFixture;
					edit: (accounts: SolInstruction['accounts']) => SolInstruction['accounts'];
				}) => {
					const instructions = instructionsOf(fixture);
					const index = indexOf({ instructions, programAddress: JUPITER });
					const route = instructions[index];

					assertNonNullish(route);

					return replaceAt({
						instructions,
						index,
						instruction: { ...route, accounts: edit(route.accounts) }
					});
				};

				const withRouteAccount = ({
					fixture,
					index,
					account
				}: {
					fixture?: LifiSolTransactionFixture;
					index: number;
					account: SolAddress;
				}) =>
					withRouteAccounts({
						fixture,
						edit: (accounts) =>
							(accounts ?? []).map((meta, metaIndex) =>
								metaIndex === index ? { ...meta, address: address(account) } : meta
							)
					});

				it.each([
					{ account: 'user_transfer_authority', index: 0 },
					{ account: 'user_source_token_account', index: 1 },
					{ account: 'source_mint', index: 3 },
					{ account: 'destination_mint', index: 4 },
					{ account: 'source_token_program', index: 5 }
				])('should refuse another $account', async ({ index }) => {
					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: withRouteAccount({ index, account: mockSolAddress2 })
					});
				});

				it('should refuse a route missing the accounts the binding reads', async () => {
					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: withRouteAccounts({ edit: (accounts) => (accounts ?? []).slice(0, 5) })
					});
				});

				// Lamports sent to the wrapped SOL account and never synced are not part of its token
				// amount, so a run spending them shows no decrease of it.
				it("should refuse an SPL source's route spending the user's wrapped SOL", async () => {
					const wrappedSolAccount = await ataOf({
						owner: mockLifiSolUser,
						mint: WSOL_TOKEN.address
					});

					const sync = instructionAt({
						instructions: instructionsOf(mockLifiSolSolToUsdc),
						programAddress: TOKEN_PROGRAM_ADDRESS
					});

					const route = withRouteAccounts({
						fixture: mockLifiSolUsdcToUsdt,
						edit: (accounts) =>
							(accounts ?? []).map((meta, index) =>
								index === 1
									? { ...meta, address: address(wrappedSolAccount) }
									: index === 3
										? { ...meta, address: address(WSOL_TOKEN.address) }
										: meta
							)
					});

					await expectRejected({ fixture: mockLifiSolUsdcToUsdt, instructions: [sync, ...route] });
				});

				it('should refuse a native source spent under Token-2022', async () => {
					await expectRejected({
						fixture: mockLifiSolSolToUsdc,
						instructions: withRouteAccount({ index: 5, account: TOKEN_2022_PROGRAM_ADDRESS })
					});
				});

				// The account is derived under the program the route names.
				it("should accept the source spent under Token-2022 from the user's account there", async () => {
					const sourceAccount = await ataOf({
						owner: mockLifiSolUser,
						mint: USDC,
						tokenProgram: TOKEN_2022_PROGRAM_ADDRESS
					});

					const instructions = withRouteAccounts({
						fixture: mockLifiSolUsdcToUsdt,
						edit: (accounts) =>
							(accounts ?? []).map((meta, index) =>
								index === 1
									? { ...meta, address: address(sourceAccount) }
									: index === 5
										? { ...meta, address: address(TOKEN_2022_PROGRAM_ADDRESS) }
										: meta
							)
					});

					await expect(
						assertWith({ fixture: mockLifiSolUsdcToUsdt, instructions })
					).resolves.toBeDefined();
				});

				describe('shared_accounts_route_v2', () => {
					// The fixture's `route_v2` as its shared-accounts form: the same arguments behind an
					// `id`, and the program's authority and token accounts among the user's.
					const sharedRoute = (edit: (accounts: SolAddress[]) => SolAddress[] = (a) => a) => {
						const instructions = instructionsOf(mockLifiSolSolToUsdc);
						const index = indexOf({ instructions, programAddress: JUPITER });
						const route = instructions[index];

						assertNonNullish(route?.data);

						const [
							user,
							source,
							destination,
							sourceMint,
							destinationMint,
							sourceProgram,
							destinationProgram,
							,
							eventAuthority,
							program
						] = (route.accounts ?? []).map(({ address }) => address);

						const accounts = edit(
							[
								mockSolAddress2,
								user,
								source,
								mockAtaAddress,
								mockAtaAddress2,
								destination,
								sourceMint,
								destinationMint,
								sourceProgram,
								destinationProgram,
								eventAuthority,
								program
							].filter(nonNullish)
						);

						return replaceAt({
							instructions,
							index,
							instruction: {
								...route,
								accounts: accounts.map((account) => ({
									address: address(account),
									role: AccountRole.WRITABLE
								})),
								data: new Uint8Array([
									...getBase16Encoder().encode(JUPITER_SHARED_ACCOUNTS_ROUTE_V2_DISCRIMINATOR),
									0,
									...route.data.slice(8)
								])
							}
						});
					};

					it('should accept it with its own accounts', async () => {
						await expect(
							assertWith({ fixture: mockLifiSolSolToUsdc, instructions: sharedRoute() })
						).resolves.toBeDefined();
					});

					it.each([
						{ account: 'user_transfer_authority', index: 1 },
						{ account: 'source_token_account', index: 2 },
						{ account: 'source_mint', index: 6 },
						{ account: 'destination_mint', index: 7 },
						{ account: 'source_token_program', index: 8 }
					])('should refuse another $account', async ({ index }) => {
						await expectRejected({
							fixture: mockLifiSolSolToUsdc,
							instructions: sharedRoute((accounts) =>
								accounts.map((account, accountIndex) =>
									accountIndex === index ? mockSolAddress2 : account
								)
							)
						});
					});
				});
			});

			it('should refuse a route spending more than the amount without a fee', async () => {
				const instructions = withRoute({
					fixture: mockLifiSolUsdcToUsdt,
					edit: ({ view }) => view.setBigUint64(8, 20_000_001n, true)
				}).filter(
					({ programAddress }) =>
						programAddress !== LIFI_SOLANA_FEE_PROGRAM && programAddress !== TOKEN_PROGRAM_ADDRESS
				);

				await expectRejected({ fixture: mockLifiSolUsdcToUsdt, instructions });
			});
		});
	});

	describe('assertLifiSolSimulation', () => {
		const user = mockLifiSolUser;
		const wrappedSolAccount = mockAtaAddress;
		const usdcAccount = mockAtaAddress2;
		const otherAccount = mockAtaAddress3;
		const ceiling = 5_000_000n;
		const amount = 100_000_000n;
		const toAmountMin = 10_338_547n;

		const solToUsdc: LifiSolBinding = {
			userAddress: user,
			fromToken: SYSTEM_PROGRAM_ADDRESS,
			toToken: USDC,
			amount,
			displayedToAmountMin: toAmountMin
		};

		const usdcToSol: LifiSolBinding = {
			userAddress: user,
			fromToken: USDC,
			toToken: SYSTEM_PROGRAM_ADDRESS,
			amount: 20_000_000n,
			displayedToAmountMin: 190_558_418n
		};

		const usdcDelta = (delta: bigint) => ({
			account: usdcAccount,
			tokenAddress: USDC,
			decimals: 6,
			delta
		});

		const resultWith = ({
			preview,
			unreadPrograms = []
		}: {
			preview?: SolSimulationPreview;
			unreadPrograms?: SolAddress[];
		}): SolSimulationResult => ({
			...(preview !== undefined && { preview }),
			parties: { sources: [], destinations: [], partial: false },
			unreadPrograms
		});

		const solToUsdcPreview: SolSimulationPreview = {
			solDelta: -amount - ceiling,
			tokenDeltas: [usdcDelta(toAmountMin)],
			controlChanges: [],
			createdAccounts: [{ account: usdcAccount, owner: user }]
		};

		const assertWith = ({
			result,
			binding = solToUsdc
		}: {
			result: SolSimulationResult | undefined;
			binding?: LifiSolBinding;
		}) => assertLifiSolSimulation({ result, binding, wrappedSolAccount, ceiling });

		it('should accept a swap within every bound', () => {
			expect(() => assertWith({ result: resultWith({ preview: solToUsdcPreview }) })).not.toThrow();
		});

		it('should refuse when the simulation failed', () => {
			expect(() => assertWith({ result: undefined })).toThrow(LifiQuoteRejectedError);
		});

		it('should refuse when the run changed nothing of the user', () => {
			expect(() => assertWith({ result: resultWith({}) })).toThrow(LifiQuoteRejectedError);
		});

		describe('programs', () => {
			it('should accept a pinned program reached inside the route', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: solToUsdcPreview,
							unreadPrograms: ['HBVw6bZtcCaezhcBrmfyXBSBRWCdv72271xQ4GPvms2z']
						})
					})
				).not.toThrow();
			});

			it('should refuse a program neither known nor pinned', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: solToUsdcPreview,
							unreadPrograms: ['HBVw6bZtcCaezhcBrmfyXBSBRWCdv72271xQ4GPvms2z', mockSolAddress2]
						})
					})
				).toThrow(LifiQuoteRejectedError);
			});
		});

		it('should refuse a control change', () => {
			expect(() =>
				assertWith({
					result: resultWith({
						preview: {
							...solToUsdcPreview,
							controlChanges: [{ account: usdcAccount, field: 'delegate', to: mockSolAddress2 }]
						}
					})
				})
			).toThrow(LifiQuoteRejectedError);
		});

		describe('created accounts', () => {
			it.each([
				{ account: 'owned by anyone else', control: { owner: mockSolAddress2 } },
				{ account: 'with a delegate', control: { owner: user, delegate: mockSolAddress2 } },
				{
					account: 'closable by anyone else',
					control: { owner: user, closeAuthority: mockSolAddress2 }
				}
			])('should refuse one $account', ({ control }) => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								...solToUsdcPreview,
								createdAccounts: [{ account: usdcAccount, ...control }]
							}
						})
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should accept one closable by the user', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								...solToUsdcPreview,
								createdAccounts: [{ account: usdcAccount, owner: user, closeAuthority: user }]
							}
						})
					})
				).not.toThrow();
			});
		});

		describe('closed accounts', () => {
			const parsedSystemAccount = (lamports: bigint): NonNullable<SolanaParsedAccountInfo> =>
				({
					executable: false,
					lamports,
					owner: SYSTEM_PROGRAM_ADDRESS,
					space: ZERO,
					data: ['', 'base64']
				}) as unknown as NonNullable<SolanaParsedAccountInfo>;

			const parsedTokenAccount = ({
				mint,
				amount,
				decimals
			}: {
				mint: SolAddress;
				amount: bigint;
				decimals: number;
			}): NonNullable<SolanaParsedAccountInfo> =>
				({
					executable: false,
					lamports: 2_039_280n,
					owner: TOKEN_PROGRAM_ADDRESS,
					space: 165n,
					data: {
						program: 'spl-token',
						space: 165n,
						parsed: {
							type: 'account',
							info: { mint, owner: user, tokenAmount: { amount: `${amount}`, decimals } }
						}
					}
				}) as unknown as NonNullable<SolanaParsedAccountInfo>;

			// Mainnet reported a wrapped SOL account a LI.FI route closed as the latter (2026-10-23).
			const closedRepresentations = [
				{ representation: 'no account', closed: null },
				{
					representation: 'a System account holding no lamports',
					closed: parsedSystemAccount(ZERO)
				}
			];

			// SOL → USDC at its bounds, closing the user's empty wrapped SOL account.
			const previewClosing = (closed: SolanaParsedAccountInfo) =>
				mapSolSimulationPreview({
					addresses: [user, wrappedSolAccount, usdcAccount],
					preAccounts: [
						parsedSystemAccount(1_000_000_000n),
						parsedTokenAccount({ mint: WSOL_TOKEN.address, amount: ZERO, decimals: 9 }),
						null
					],
					postAccounts: [
						parsedSystemAccount(1_000_000_000n - amount - ceiling + 2_039_280n),
						closed,
						parsedTokenAccount({ mint: USDC, amount: toAmountMin, decimals: 6 })
					],
					userAddress: user
				});

			it.each(closedRepresentations)(
				"should accept the user's empty wrapped SOL account closed, reported as $representation",
				({ closed }) => {
					expect(() =>
						assertWith({ result: resultWith({ preview: previewClosing(closed) }) })
					).not.toThrow();
				}
			);

			it.each(closedRepresentations)(
				'should still refuse a control change on another account, a close reported as $representation',
				({ closed }) => {
					const preview = previewClosing(closed);

					expect(() =>
						assertWith({
							result: resultWith({
								preview: {
									...preview,
									controlChanges: [
										...preview.controlChanges,
										{ account: usdcAccount, field: 'delegate', to: mockSolAddress2 }
									]
								}
							})
						})
					).toThrow(LifiQuoteRejectedError);
				}
			);

			const rent = 2_039_280n;

			it("should accept the user's wrapped SOL account holding none, its lamports not received", () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								...solToUsdcPreview,
								solDelta: -amount - ceiling + rent,
								closedAccounts: [{ account: wrappedSolAccount, lamports: rent }]
							}
						})
					})
				).not.toThrow();
			});

			// With wrapped SOL as the source, spending it all is within the amount: only the close refuses.
			it("should refuse the user's wrapped SOL account when it held wrapped SOL", () => {
				const wsolToUsdc: LifiSolBinding = {
					...solToUsdc,
					fromToken: WSOL_TOKEN.address,
					amount: 1_000n
				};

				const preview: SolSimulationPreview = {
					solDelta: rent,
					tokenDeltas: [
						usdcDelta(toAmountMin),
						{
							account: wrappedSolAccount,
							tokenAddress: WSOL_TOKEN.address,
							decimals: 9,
							delta: -1_000n
						}
					],
					controlChanges: []
				};

				expect(() =>
					assertWith({ result: resultWith({ preview }), binding: wsolToUsdc })
				).not.toThrow();
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								...preview,
								closedAccounts: [{ account: wrappedSolAccount, lamports: rent + 1_000n }]
							}
						}),
						binding: wsolToUsdc
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should refuse any other account of the user', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								...solToUsdcPreview,
								closedAccounts: [{ account: otherAccount, lamports: ZERO }]
							}
						})
					})
				).toThrow(LifiQuoteRejectedError);
			});

			// Counted, the refund would let a forged route underpay a native destination by as much.
			it('should not count the lamports the closed account held as received', () => {
				const preview = (solReceived: bigint): SolSimulationPreview => ({
					solDelta: solReceived + rent,
					tokenDeltas: [usdcDelta(-usdcToSol.amount)],
					controlChanges: [],
					closedAccounts: [{ account: wrappedSolAccount, lamports: rent }]
				});

				const atMinimum = usdcToSol.displayedToAmountMin - ceiling;

				expect(() =>
					assertWith({ result: resultWith({ preview: preview(atMinimum) }), binding: usdcToSol })
				).not.toThrow();
				expect(() =>
					assertWith({
						result: resultWith({ preview: preview(atMinimum - 1n) }),
						binding: usdcToSol
					})
				).toThrow(LifiQuoteRejectedError);
			});
		});

		describe('spend', () => {
			it('should accept spending the whole amount of an SPL source', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								solDelta: usdcToSol.displayedToAmountMin - ceiling,
								tokenDeltas: [usdcDelta(-usdcToSol.amount)],
								controlChanges: []
							}
						}),
						binding: usdcToSol
					})
				).not.toThrow();
			});

			it('should refuse spending more than the amount of an SPL source', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								solDelta: usdcToSol.displayedToAmountMin,
								tokenDeltas: [usdcDelta(-usdcToSol.amount - 1n)],
								controlChanges: []
							}
						}),
						binding: usdcToSol
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should sum the source token over every account of the user', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								solDelta: usdcToSol.displayedToAmountMin,
								tokenDeltas: [
									usdcDelta(-usdcToSol.amount),
									{ ...usdcDelta(-1n), account: otherAccount }
								],
								controlChanges: []
							}
						}),
						binding: usdcToSol
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should refuse another token account of the user decreasing', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								solDelta: usdcToSol.displayedToAmountMin,
								tokenDeltas: [
									usdcDelta(-usdcToSol.amount),
									{ account: otherAccount, tokenAddress: PYUSD, decimals: 6, delta: -1n }
								],
								controlChanges: []
							}
						}),
						binding: usdcToSol
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should refuse a token account decreasing for a native source', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								...solToUsdcPreview,
								tokenDeltas: [
									usdcDelta(toAmountMin + 1n),
									{ ...usdcDelta(-1n), account: otherAccount }
								]
							}
						})
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should refuse more SOL than the amount of a native source and the ceiling', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: { ...solToUsdcPreview, solDelta: -amount - ceiling - 1n }
						})
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should refuse more SOL than the ceiling for an SPL source', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								solDelta: -ceiling - 1n,
								tokenDeltas: [
									usdcDelta(-usdcToSol.amount),
									{ account: otherAccount, tokenAddress: PYUSD, decimals: 6, delta: 1n }
								],
								controlChanges: []
							}
						}),
						binding: { ...usdcToSol, toToken: PYUSD, displayedToAmountMin: 1n }
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should accept exactly the ceiling for an SPL source', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								solDelta: -ceiling,
								tokenDeltas: [
									usdcDelta(-usdcToSol.amount),
									{ account: otherAccount, tokenAddress: PYUSD, decimals: 6, delta: 1n }
								],
								controlChanges: []
							}
						}),
						binding: { ...usdcToSol, toToken: PYUSD, displayedToAmountMin: 1n }
					})
				).not.toThrow();
			});
		});

		describe('receipt', () => {
			it('should refuse less of the destination token than the minimum displayed', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: { ...solToUsdcPreview, tokenDeltas: [usdcDelta(toAmountMin - 1n)] }
						})
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should refuse a run with no delta of the destination token', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: { ...solToUsdcPreview, tokenDeltas: [] }
						})
					})
				).toThrow(LifiQuoteRejectedError);
			});

			it('should refuse native SOL received below the minimum less the ceiling', () => {
				expect(() =>
					assertWith({
						result: resultWith({
							preview: {
								solDelta: usdcToSol.displayedToAmountMin - ceiling - 1n,
								tokenDeltas: [usdcDelta(-usdcToSol.amount)],
								controlChanges: []
							}
						}),
						binding: usdcToSol
					})
				).toThrow(LifiQuoteRejectedError);
			});
		});
	});
});
