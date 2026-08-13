import { ZERO } from '$lib/constants/app.constants';
import { getMultipleAccountsInfo, simulateTransactionAccounts } from '$sol/api/solana.api';
import {
	SOLANA_SIMULATION_MAX_ACCOUNTS,
	TOKEN_PROGRAM_ADDRESS
} from '$sol/constants/sol.constants';
import { simulateSolTransaction } from '$sol/services/sol-simulation.services';
import type { SolAddress } from '$sol/types/address';
import type {
	SolanaParsedAccountsInfo,
	SolanaSimulatedInnerInstructions
} from '$sol/types/sol-rpc';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import {
	mockAtaAddress,
	mockSolAddress,
	mockSolAddress2,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { AccountRole } from '@solana/kit';

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
		network
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
