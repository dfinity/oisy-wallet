import { ZERO } from '$lib/constants/app.constants';
import { getMultipleAccountsInfo, simulateTransactionAccounts } from '$sol/api/solana.api';
import {
	SOLANA_SIMULATION_MAX_ACCOUNTS,
	SOLANA_SIMULATION_TIMEOUT_MILLISECONDS,
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
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { getCreateAssociatedTokenIdempotentInstruction } from '@solana-program/token';
import {
	AccountRole,
	address,
	appendTransactionMessageInstruction,
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
		innerInstructions = []
	}: {
		err?: string | null;
		accounts: SolanaParsedAccountsInfo;
		innerInstructions?: SolanaSimulatedInnerInstructions;
	}) =>
		({ err, accounts, innerInstructions }) as unknown as Awaited<
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
});
