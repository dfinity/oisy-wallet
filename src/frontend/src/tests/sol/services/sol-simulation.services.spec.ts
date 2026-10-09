import { ZERO } from '$lib/constants/app.constants';
import { getMultipleAccountsInfo, simulateTransactionAccounts } from '$sol/api/solana.api';
import {
	SOLANA_SIMULATION_MAX_ACCOUNTS,
	SOLANA_SIMULATION_TIMEOUT_MILLISECONDS,
	STAKE_PROGRAM_ADDRESS,
	SYSTEM_PROGRAM_ADDRESS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { simulateSolTransaction } from '$sol/services/sol-simulation.services';
import type { SolAddress } from '$sol/types/address';
import type {
	SolanaParsedAccountsInfo,
	SolanaSimulatedInnerInstructions
} from '$sol/types/sol-rpc';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import * as solInstructionSummaryUtils from '$sol/utils/sol-instruction-summary.utils';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { getCreateAssociatedTokenIdempotentInstruction } from '@solana-program/token';
import {
	AccountRole,
	address,
	appendTransactionMessageInstruction,
	appendTransactionMessageInstructions,
	blockhash,
	createNoopSigner,
	createTransactionMessage,
	pipe,
	setTransactionMessageFeePayer,
	setTransactionMessageLifetimeUsingBlockhash
} from '@solana/kit';

vi.mock('$sol/api/solana.api', () => ({
	getMultipleAccountsInfo: vi.fn(),
	simulateTransactionAccounts: vi.fn()
}));

describe('sol-simulation.services', () => {
	const base64EncodedTransactionMessage = 'mockBase64Transaction';
	const network = 'mainnet' as const;

	const message = (writable: SolAddress[]): CompilableTransactionMessage =>
		({
			feePayer: { address: mockSolAddress },
			instructions: [
				{ accounts: writable.map((address) => ({ address, role: AccountRole.WRITABLE })) }
			]
		}) as unknown as CompilableTransactionMessage;

	const systemAccount = (lamports: bigint) =>
		({
			executable: false,
			lamports,
			owner: '11111111111111111111111111111111',
			space: ZERO,
			data: ['', 'base64']
		}) as unknown as SolanaParsedAccountsInfo[number];

	const tokenAccount = ({ owner, amount }: { owner: SolAddress; amount: bigint }) =>
		({
			executable: false,
			lamports: 2_039_280n,
			owner: TOKEN_PROGRAM_ADDRESS,
			space: 165n,
			data: {
				parsed: {
					type: 'account',
					info: {
						mint: mockSplAddress,
						owner,
						tokenAmount: { amount: `${amount}`, decimals: 6 }
					}
				}
			}
		}) as unknown as SolanaParsedAccountsInfo[number];

	// A cross-program invocation as the RPC reports it, which is where a routed swap performs every
	// one of its transfers.
	const innerTransfer = ({
		source,
		destination
	}: {
		source: SolAddress;
		destination: SolAddress;
	}): SolanaSimulatedInnerInstructions =>
		[
			{
				index: 0,
				instructions: [
					{
						program: 'spl-token',
						programId: TOKEN_PROGRAM_ADDRESS,
						parsed: {
							type: 'transfer',
							info: { source, destination, amount: '1000' }
						}
					}
				]
			}
		] as unknown as SolanaSimulatedInnerInstructions;

	const params = (transactionMessage: CompilableTransactionMessage) => ({
		base64EncodedTransactionMessage,
		transactionMessage,
		address: mockSolAddress,
		network,
		rentExemptMinimumRequest: Promise.resolve(2_039_280n)
	});

	const simulated = ({
		err = null,
		accounts,
		innerInstructions = [],
		fee
	}: {
		err?: string | null;
		accounts: SolanaParsedAccountsInfo;
		innerInstructions?: SolanaSimulatedInnerInstructions;
		fee?: bigint;
	}) =>
		({ err, accounts, innerInstructions, fee }) as unknown as Awaited<
			ReturnType<typeof simulateTransactionAccounts>
		>;

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(getMultipleAccountsInfo).mockResolvedValue([]);
		vi.mocked(simulateTransactionAccounts).mockResolvedValue(simulated({ accounts: [] }));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should diff the pre-state against the simulated post-state', async () => {
		vi.mocked(getMultipleAccountsInfo).mockResolvedValue([systemAccount(1_000_000n)]);
		vi.mocked(simulateTransactionAccounts).mockResolvedValue(
			simulated({ accounts: [systemAccount(994_000n)] })
		);

		const result = await simulateSolTransaction(params(message([])));

		expect(result?.preview).toEqual({ solDelta: -6_000n, tokenDeltas: [], controlChanges: [] });
	});

	it('should issue the pre-state read and the simulation for the same bounded address list', async () => {
		vi.mocked(getMultipleAccountsInfo).mockResolvedValue([null, null]);
		vi.mocked(simulateTransactionAccounts).mockResolvedValue(simulated({ accounts: [null, null] }));

		await simulateSolTransaction(params(message([mockAtaAddress])));

		const addresses = [mockSolAddress, mockAtaAddress];

		expect(getMultipleAccountsInfo).toHaveBeenCalledExactlyOnceWith({ addresses, network });
		expect(simulateTransactionAccounts).toHaveBeenCalledExactlyOnceWith({
			base64EncodedTransactionMessage,
			addresses,
			network
		});
	});

	it('should not simulate at all when the message names more writable accounts than the bound', async () => {
		const tooMany = Array.from(
			{ length: SOLANA_SIMULATION_MAX_ACCOUNTS + 1 },
			(_, index) => `${mockAtaAddress}${index}` as SolAddress
		);

		const result = await simulateSolTransaction(params(message(tooMany)));

		expect(result).toBeUndefined();
		expect(simulateTransactionAccounts).not.toHaveBeenCalled();
	});

	it('should yield nothing when the simulated transaction would itself fail', async () => {
		vi.mocked(getMultipleAccountsInfo).mockResolvedValue([systemAccount(1_000_000n)]);
		vi.mocked(simulateTransactionAccounts).mockResolvedValue(
			simulated({ err: 'AccountNotFound', accounts: [systemAccount(1n)] })
		);

		const result = await simulateSolTransaction(params(message([])));

		expect(result).toBeUndefined();
	});

	it('should fail open when the RPC throws', async () => {
		vi.mocked(getMultipleAccountsInfo).mockRejectedValue(new Error('rpc down'));
		vi.mocked(simulateTransactionAccounts).mockRejectedValue(new Error('rpc down'));

		await expect(simulateSolTransaction(params(message([])))).resolves.toBeUndefined();
	});

	// A creation may fund a token account with more than its reserve and let the initialisation read
	// the difference as the balance, so the list can only split the two with the reserve the decode
	// read, which it is handed rather than asking the chain again.
	it('should hand the reserve it is given to the instruction list', async () => {
		const spyMapSolInstructionSummaries = vi.spyOn(
			solInstructionSummaryUtils,
			'mapSolInstructionSummaries'
		);

		await simulateSolTransaction({
			...params(message([])),
			rentExemptMinimumRequest: Promise.resolve(1_488_440n)
		});

		expect(spyMapSolInstructionSummaries).toHaveBeenCalledWith(
			expect.objectContaining({ rentExemptMinimum: 1_488_440n })
		);
	});

	// The decode starts the run before the reserve arrives, so waiting for it has to fall inside the
	// run's own timeout: otherwise a stalled reserve would hold the review past it.
	it('should give up on a reserve that never arrives within its own timeout', async () => {
		vi.useFakeTimers();

		const pending = simulateSolTransaction({
			...params(message([])),
			rentExemptMinimumRequest: new Promise(() => undefined)
		});

		await vi.advanceTimersByTimeAsync(SOLANA_SIMULATION_TIMEOUT_MILLISECONDS);

		await expect(pending).resolves.toBeUndefined();
	});

	it('should yield nothing without a wallet address', async () => {
		const result = await simulateSolTransaction({
			...params(message([])),
			address: undefined
		});

		expect(result).toBeUndefined();
		expect(simulateTransactionAccounts).not.toHaveBeenCalled();
	});

	it('should yield no preview when nothing about the user accounts changes', async () => {
		vi.mocked(getMultipleAccountsInfo).mockResolvedValue([systemAccount(1_000_000n)]);
		vi.mocked(simulateTransactionAccounts).mockResolvedValue(
			simulated({ accounts: [systemAccount(1_000_000n)] })
		);

		const result = await simulateSolTransaction(params(message([])));

		expect(result?.preview).toBeUndefined();
	});

	// An idempotent creation of an account that is already there does nothing, so a run of a
	// message made of nothing else has nothing to list. That is its answer rather than a gap: left
	// out, the review rebuilt the list from the message alone, which cannot tell that the account
	// was there and listed the creation as one.
	// An account a program opens inside its own instruction reaches the review through the run alone,
	// so it is the run that says whether one was funded above its rent.
	describe('accounts opened inside an instruction', () => {
		const innerOpening = (lamports: number): SolanaSimulatedInnerInstructions =>
			[
				{
					index: 0,
					instructions: [
						{
							program: 'system',
							programId: address(SYSTEM_PROGRAM_ADDRESS),
							parsed: {
								type: 'createAccount',
								info: {
									source: mockSolAddress,
									newAccount: mockSolAddress2,
									lamports,
									space: 165,
									owner: TOKEN_PROGRAM_ADDRESS
								}
							}
						}
					]
				}
			] satisfies SolanaSimulatedInnerInstructions;

		it('should say so when one is funded above its rent', async () => {
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({ accounts: [], innerInstructions: innerOpening(2_039_281) })
			);

			const result = await simulateSolTransaction(params(message([])));

			expect(result?.opensAccountBeyondRent).toBeTruthy();
		});

		it('should say nothing when one is funded with exactly its rent', async () => {
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({ accounts: [], innerInstructions: innerOpening(2_039_280) })
			);

			const result = await simulateSolTransaction(params(message([])));

			expect(result).not.toHaveProperty('opensAccountBeyondRent');
		});
	});

	// An application closing an account of its own moves the lamports itself, and only the account's
	// state before and after the run says so. It is listed when the wallet's change shows that every
	// lamport of it came home.
	describe('accounts an application closes', () => {
		const application = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo';
		const rent = 41_899_840n;
		const fee = 5_000n;

		const closing = {
			feePayer: { address: mockSolAddress },
			instructions: [
				{
					programAddress: application,
					accounts: [
						{ address: mockSolAddress2, role: AccountRole.WRITABLE },
						{ address: mockSolAddress, role: AccountRole.WRITABLE_SIGNER }
					]
				}
			]
		} as unknown as CompilableTransactionMessage;

		const appAccount = {
			executable: false,
			lamports: rent,
			owner: application,
			space: 8120n,
			data: ['', 'base64']
		} as unknown as SolanaParsedAccountsInfo[number];

		// The instruction's only call is the program logging an event about itself.
		const eventLog = [
			{ index: 0, instructions: [{ programId: application, accounts: [], data: '' }] }
		] as unknown as SolanaSimulatedInnerInstructions;

		const run = async ({
			walletAfter,
			withFee = true
		}: {
			walletAfter: bigint;
			withFee?: boolean;
		}) => {
			vi.mocked(getMultipleAccountsInfo).mockResolvedValue([systemAccount(1_000_000n), appAccount]);
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [systemAccount(walletAfter), null],
					innerInstructions: eventLog,
					...(withFee && { fee })
				})
			);

			return await simulateSolTransaction(params(closing));
		};

		it('should list the close under its instruction when the rent came home', async () => {
			const result = await run({ walletAfter: 1_000_000n + rent - fee });

			expect(result?.instructions).toStrictEqual([
				{
					kind: 'route',
					program: application,
					children: [
						{ kind: 'closeAccount', account: mockSolAddress2, program: application, returned: rent }
					]
				}
			]);
		});

		// Without the fee the wallet paid, the comparison is off by that fee: here an inflow from
		// elsewhere as large as the fee would make it pass.
		it('should list no close from a run that leaves out the fee', async () => {
			const result = await run({ walletAfter: 1_000_000n + rent, withFee: false });

			expect(result?.instructions).toStrictEqual([{ kind: 'unknown', program: application }]);
		});

		describe('when several instructions call the program with the account', () => {
			// Two calls of the application's program with the account: which one emptied it, only a
			// second run up to the last of them can say.
			const twice = pipe(
				createTransactionMessage({ version: 0 }),
				(tx) => setTransactionMessageFeePayer(address(mockSolAddress), tx),
				(tx) =>
					setTransactionMessageLifetimeUsingBlockhash(
						{
							blockhash: blockhash('HSR6rNUUeh6Grf2mVzP6u33wEfvXeLt7rNaTqkQoFLtN'),
							lastValidBlockHeight: 100n
						},
						tx
					),
				(tx) =>
					appendTransactionMessageInstructions(
						[0, 1].map(() => ({
							programAddress: address(application),
							accounts: [
								{ address: address(mockSolAddress2), role: AccountRole.WRITABLE },
								{ address: address(mockSolAddress), role: AccountRole.WRITABLE_SIGNER }
							]
						})),
						tx
					)
			);

			const eventLogs = [0, 1].map((index) => ({
				index,
				instructions: [{ programId: application, accounts: [], data: '' }]
			})) as unknown as SolanaSimulatedInnerInstructions;

			const runTwice = async (beforeLastCall: bigint) => {
				vi.mocked(getMultipleAccountsInfo).mockResolvedValue([
					systemAccount(1_000_000n),
					appAccount
				]);
				vi.mocked(simulateTransactionAccounts)
					.mockResolvedValueOnce(
						simulated({
							accounts: [systemAccount(1_000_000n + rent - fee), null],
							innerInstructions: eventLogs,
							fee
						})
					)
					.mockResolvedValueOnce(
						simulated({
							accounts: [
								{
									...appAccount,
									lamports: beforeLastCall
								} as unknown as SolanaParsedAccountsInfo[number]
							]
						})
					);

				return await simulateSolTransaction(params(twice));
			};

			it('should give the close to the last call when the account held its lamports until then', async () => {
				const result = await runTwice(rent);

				expect(simulateTransactionAccounts).toHaveBeenLastCalledWith(
					expect.objectContaining({ addresses: [mockSolAddress2] })
				);
				expect(result?.instructions).toStrictEqual([
					{ kind: 'unknown', program: application },
					{
						kind: 'route',
						program: application,
						children: [
							{
								kind: 'closeAccount',
								account: mockSolAddress2,
								program: application,
								returned: rent
							}
						]
					}
				]);
			});

			// The account was emptied by the first call, and the second one names it again: it must not
			// borrow the close and with it a line.
			it('should leave the close without an instruction when the account was already empty', async () => {
				const result = await runTwice(ZERO);

				expect(result?.instructions).toStrictEqual([
					{ kind: 'unknown', program: application },
					{ kind: 'unknown', program: application }
				]);
			});

			// Accounts whose last call is the same instruction share the run up to it, so a message
			// closing many of them behind the same calls costs one second run rather than one each.
			it('should check accounts that share their last call in a single run', async () => {
				const both = pipe(
					createTransactionMessage({ version: 0 }),
					(tx) => setTransactionMessageFeePayer(address(mockSolAddress), tx),
					(tx) =>
						setTransactionMessageLifetimeUsingBlockhash(
							{
								blockhash: blockhash('HSR6rNUUeh6Grf2mVzP6u33wEfvXeLt7rNaTqkQoFLtN'),
								lastValidBlockHeight: 100n
							},
							tx
						),
					(tx) =>
						appendTransactionMessageInstructions(
							[0, 1].map(() => ({
								programAddress: address(application),
								accounts: [
									{ address: address(mockSolAddress2), role: AccountRole.WRITABLE },
									{ address: address(mockSolAddress3), role: AccountRole.WRITABLE },
									{ address: address(mockSolAddress), role: AccountRole.WRITABLE_SIGNER }
								]
							})),
							tx
						)
				);

				vi.mocked(getMultipleAccountsInfo).mockResolvedValue([
					systemAccount(1_000_000n),
					appAccount,
					appAccount
				]);
				vi.mocked(simulateTransactionAccounts)
					.mockResolvedValueOnce(
						simulated({
							accounts: [systemAccount(1_000_000n + rent * 2n - fee), null, null],
							innerInstructions: eventLogs,
							fee
						})
					)
					.mockResolvedValueOnce(simulated({ accounts: [appAccount, appAccount] }));

				const result = await simulateSolTransaction(params(both));

				expect(simulateTransactionAccounts).toHaveBeenCalledTimes(2);
				expect(simulateTransactionAccounts).toHaveBeenLastCalledWith(
					expect.objectContaining({ addresses: [mockSolAddress2, mockSolAddress3] })
				);
				expect(result?.instructions).toStrictEqual([
					{ kind: 'unknown', program: application },
					{
						kind: 'route',
						program: application,
						children: [mockSolAddress2, mockSolAddress3].map((account) => ({
							kind: 'closeAccount',
							account,
							program: application,
							returned: rent
						}))
					}
				]);
			});
		});

		// The closed account pays somebody else, and a second app account that stays open pays the
		// wallet the same amount: the wallet's change alone would credit the close with it.
		it('should list no close when an open app account pays the wallet', async () => {
			const other = mockSolAddress3;

			const withOther = {
				feePayer: { address: mockSolAddress },
				instructions: [
					{
						programAddress: application,
						accounts: [
							{ address: mockSolAddress2, role: AccountRole.WRITABLE },
							{ address: mockSolAddress, role: AccountRole.WRITABLE_SIGNER },
							{ address: other, role: AccountRole.WRITABLE }
						]
					}
				]
			} as unknown as CompilableTransactionMessage;

			const holding = (lamports: bigint) =>
				({ ...appAccount, lamports }) as unknown as SolanaParsedAccountsInfo[number];

			vi.mocked(getMultipleAccountsInfo).mockResolvedValue([
				systemAccount(1_000_000n),
				appAccount,
				holding(100_000_000n)
			]);
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [systemAccount(1_000_000n + rent - fee), null, holding(100_000_000n - rent)],
					innerInstructions: eventLog,
					fee
				})
			);

			const result = await simulateSolTransaction(params(withOther));

			expect(result?.instructions).toStrictEqual([{ kind: 'unknown', program: application }]);
		});

		// Nothing then says where the rent went, and the instruction stays one nothing describes.
		it('should leave the instruction undescribed when the rent went elsewhere', async () => {
			const result = await run({ walletAfter: 1_000_000n - fee });

			expect(result?.instructions).toStrictEqual([{ kind: 'unknown', program: application }]);
		});
	});

	it('should keep an empty list for a run with nothing to list', async () => {
		const accountAt = ({ addresses }: { addresses: SolAddress[] }) =>
			addresses.map((account) =>
				account === mockAtaAddress
					? tokenAccount({ owner: mockSolAddress, amount: ZERO })
					: systemAccount(1_000_000n)
			);

		vi.mocked(getMultipleAccountsInfo).mockImplementation((params) =>
			Promise.resolve(accountAt(params))
		);
		vi.mocked(simulateTransactionAccounts).mockImplementation((params) =>
			Promise.resolve(simulated({ accounts: accountAt(params) }))
		);

		const transactionMessage = pipe(
			createTransactionMessage({ version: 0 }),
			(tx) => setTransactionMessageFeePayer(address(mockSolAddress), tx),
			(tx) =>
				setTransactionMessageLifetimeUsingBlockhash(
					{
						blockhash: blockhash('HSR6rNUUeh6Grf2mVzP6u33wEfvXeLt7rNaTqkQoFLtN'),
						lastValidBlockHeight: 100n
					},
					tx
				),
			(tx) =>
				appendTransactionMessageInstruction(
					getCreateAssociatedTokenIdempotentInstruction({
						payer: createNoopSigner(address(mockSolAddress)),
						ata: address(mockAtaAddress),
						owner: address(mockSolAddress),
						mint: address(mockSplAddress)
					}),
					tx
				)
		);

		const result = await simulateSolTransaction(params(transactionMessage));

		expect(result?.instructions).toStrictEqual([]);
	});

	describe('transfer parties', () => {
		it('should derive the lists from the transfers made inside cross-program invocations', async () => {
			vi.mocked(getMultipleAccountsInfo).mockResolvedValue([
				null,
				tokenAccount({ owner: mockSolAddress, amount: 5_000n })
			]);
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [null, tokenAccount({ owner: mockSolAddress, amount: 4_000n })],
					innerInstructions: innerTransfer({
						source: mockAtaAddress,
						destination: mockSolAddress2
					})
				})
			);

			const result = await simulateSolTransaction(params(message([mockAtaAddress])));

			expect(result?.parties).toEqual({
				sources: [{ address: mockAtaAddress, owner: mockSolAddress, own: true }],
				destinations: [{ address: mockSolAddress2, own: false }],
				partial: false
			});
		});

		// The run reports the state after the transaction, where an address closed and opened for the
		// user within it is theirs. A transfer made from it before that was somebody else's.
		it('should read whose an account was at the transfer, not after the transaction', async () => {
			vi.mocked(getMultipleAccountsInfo).mockResolvedValue([
				null,
				tokenAccount({ owner: mockSolAddress2, amount: 1_000n })
			]);
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [null, tokenAccount({ owner: mockSolAddress, amount: ZERO })],
					innerInstructions: [
						{
							index: 0,
							instructions: [
								{
									program: 'spl-token',
									programId: address(TOKEN_PROGRAM_ADDRESS),
									parsed: {
										type: 'transfer',
										info: {
											source: mockAtaAddress,
											destination: mockAtaAddress2,
											authority: mockSolAddress2,
											amount: '1000'
										}
									}
								},
								{
									program: 'spl-token',
									programId: address(TOKEN_PROGRAM_ADDRESS),
									parsed: {
										type: 'closeAccount',
										info: {
											account: mockAtaAddress,
											destination: mockSolAddress2,
											owner: mockSolAddress2
										}
									}
								},
								{
									program: 'spl-token',
									programId: address(TOKEN_PROGRAM_ADDRESS),
									parsed: {
										type: 'initializeAccount3',
										info: { account: mockAtaAddress, mint: mockSplAddress, owner: mockSolAddress }
									}
								}
							]
						}
					]
				})
			);

			const result = await simulateSolTransaction(params(message([mockAtaAddress])));

			expect(result?.parties).toEqual({ sources: [], destinations: [], partial: false });
		});

		// A close ends the account, and until something opens the address again nothing of the
		// user's is there: SOL leaving it is not theirs, whoever held the account before.
		it('should not list an address the user closed as a source of what leaves it', async () => {
			vi.mocked(getMultipleAccountsInfo).mockResolvedValue([
				null,
				tokenAccount({ owner: mockSolAddress, amount: ZERO })
			]);
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [null, null],
					innerInstructions: [
						{
							index: 0,
							instructions: [
								{
									program: 'spl-token',
									programId: address(TOKEN_PROGRAM_ADDRESS),
									parsed: {
										type: 'closeAccount',
										info: {
											account: mockAtaAddress,
											destination: mockSolAddress,
											owner: mockSolAddress
										}
									}
								},
								{
									program: 'system',
									programId: address(SYSTEM_PROGRAM_ADDRESS),
									parsed: {
										type: 'transfer',
										info: { source: mockAtaAddress, destination: mockSolAddress2, lamports: 1_000 }
									}
								}
							]
						}
					]
				})
			);

			const result = await simulateSolTransaction(params(message([mockAtaAddress])));

			expect(result?.parties.sources).toEqual([]);
		});

		// Nothing is open at an address the message opens only later, so nothing of the user's can
		// leave it before then, even when the account opened there is theirs.
		it('should not list an address as a source of what leaves it before its opening', async () => {
			vi.mocked(getMultipleAccountsInfo).mockResolvedValue([null, null]);
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [null, tokenAccount({ owner: mockSolAddress, amount: ZERO })],
					innerInstructions: [
						{
							index: 0,
							instructions: [
								{
									program: 'system',
									programId: address(SYSTEM_PROGRAM_ADDRESS),
									parsed: {
										type: 'transfer',
										info: { source: mockAtaAddress, destination: mockSolAddress2, lamports: 1_000 }
									}
								},
								{
									program: 'spl-token',
									programId: address(TOKEN_PROGRAM_ADDRESS),
									parsed: {
										type: 'initializeAccount3',
										info: { account: mockAtaAddress, mint: mockSplAddress, owner: mockSolAddress }
									}
								}
							]
						}
					]
				})
			);

			const result = await simulateSolTransaction(params(message([mockAtaAddress])));

			expect(result?.parties.sources).toEqual([]);
		});

		it('should not mark the lists partial when the simulation supplied them', async () => {
			const result = await simulateSolTransaction(params(message([])));

			expect(result?.parties).toEqual({ sources: [], destinations: [], partial: false });
		});

		it('should keep a counterparty out of the sources of a leg it pays into', async () => {
			vi.mocked(getMultipleAccountsInfo).mockResolvedValue([
				null,
				tokenAccount({ owner: mockSolAddress, amount: ZERO })
			]);
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [null, tokenAccount({ owner: mockSolAddress, amount: 1_000n })],
					// The user receives here: a pool pays into an account of theirs.
					innerInstructions: innerTransfer({
						source: mockSolAddress2,
						destination: mockAtaAddress
					})
				})
			);

			const result = await simulateSolTransaction(params(message([mockAtaAddress])));

			expect(result?.parties).toEqual({
				sources: [],
				destinations: [{ address: mockAtaAddress, owner: mockSolAddress, own: true }],
				partial: false
			});
		});
	});

	describe('unread programs', () => {
		// Calls the run makes inside a router, handed over raw: a router's own call and one to a
		// program the wallet does not know.
		const nested = (programs: SolAddress[]) =>
			[
				{
					index: 0,
					instructions: programs.map((programId) => ({ programId, accounts: [], data: '' }))
				}
			] as unknown as SolanaSimulatedInnerInstructions;

		const JUPITER = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

		beforeEach(() => {
			vi.mocked(getMultipleAccountsInfo).mockResolvedValue([systemAccount(1_000_000n)]);
		});

		it('should name a program a nested call reaches that is not among the known ones', async () => {
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [systemAccount(994_000n)],
					innerInstructions: nested([JUPITER, STAKE_PROGRAM_ADDRESS])
				})
			);

			const result = await simulateSolTransaction(params(message([])));

			expect(result?.unreadPrograms).toEqual([STAKE_PROGRAM_ADDRESS]);
		});

		it('should name none when every nested call reaches a known program', async () => {
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [systemAccount(994_000n)],
					innerInstructions: nested([JUPITER, SYSTEM_PROGRAM_ADDRESS])
				})
			);

			const result = await simulateSolTransaction(params(message([])));

			expect(result?.unreadPrograms).toEqual([]);
		});

		it('should yield nothing when a nested call does not name its program', async () => {
			vi.mocked(simulateTransactionAccounts).mockResolvedValue(
				simulated({
					accounts: [systemAccount(994_000n)],
					innerInstructions: [
						{ index: 0, instructions: [{ programIdIndex: 3, accounts: [], data: '' }] }
					] as unknown as SolanaSimulatedInnerInstructions
				})
			);

			const result = await simulateSolTransaction(params(message([])));

			expect(result).toBeUndefined();
		});
	});
});
