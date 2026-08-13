import { ZERO } from '$lib/constants/app.constants';
import { getMultipleAccountsInfo, simulateTransactionAccounts } from '$sol/api/solana.api';
import { SOLANA_SIMULATION_MAX_ACCOUNTS } from '$sol/constants/sol.constants';
import { simulateSolTransactionPreview } from '$sol/services/sol-simulation.services';
import type { SolAddress } from '$sol/types/address';
import type { SolanaParsedAccountsInfo } from '$sol/types/sol-rpc';
import type { CompilableTransactionMessage } from '$sol/types/sol-transaction-message';
import { mockAtaAddress, mockSolAddress } from '$tests/mocks/sol.mock';
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

	const params = (transactionMessage: CompilableTransactionMessage) => ({
		base64EncodedTransactionMessage,
		transactionMessage,
		address: mockSolAddress,
		network
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should diff the pre-state against the simulated post-state', async () => {
		vi.mocked(getMultipleAccountsInfo).mockResolvedValue([systemAccount(1_000_000n)]);
		vi.mocked(simulateTransactionAccounts).mockResolvedValue({
			err: null,
			accounts: [systemAccount(994_000n)]
		});

		const preview = await simulateSolTransactionPreview(params(message([])));

		expect(preview).toEqual({ solDelta: -6_000n, tokenDeltas: [], controlChanges: [] });
	});

	it('should issue the pre-state read and the simulation for the same bounded address list', async () => {
		vi.mocked(getMultipleAccountsInfo).mockResolvedValue([null, null]);
		vi.mocked(simulateTransactionAccounts).mockResolvedValue({ err: null, accounts: [null, null] });

		await simulateSolTransactionPreview(params(message([mockAtaAddress])));

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

		const preview = await simulateSolTransactionPreview(params(message(tooMany)));

		expect(preview).toBeUndefined();
		expect(simulateTransactionAccounts).not.toHaveBeenCalled();
	});

	it('should yield no preview when the simulated transaction would itself fail', async () => {
		vi.mocked(getMultipleAccountsInfo).mockResolvedValue([systemAccount(1_000_000n)]);
		vi.mocked(simulateTransactionAccounts).mockResolvedValue({
			err: 'AccountNotFound',
			accounts: [systemAccount(1n)]
		});

		const preview = await simulateSolTransactionPreview(params(message([])));

		expect(preview).toBeUndefined();
	});

	it('should fail open when the RPC throws', async () => {
		vi.mocked(getMultipleAccountsInfo).mockRejectedValue(new Error('rpc down'));
		vi.mocked(simulateTransactionAccounts).mockRejectedValue(new Error('rpc down'));

		await expect(simulateSolTransactionPreview(params(message([])))).resolves.toBeUndefined();
	});

	it('should yield no preview without a wallet address', async () => {
		const preview = await simulateSolTransactionPreview({
			...params(message([])),
			address: undefined
		});

		expect(preview).toBeUndefined();
		expect(simulateTransactionAccounts).not.toHaveBeenCalled();
	});

	it('should yield no preview when nothing about the user accounts changes', async () => {
		vi.mocked(getMultipleAccountsInfo).mockResolvedValue([systemAccount(1_000_000n)]);
		vi.mocked(simulateTransactionAccounts).mockResolvedValue({
			err: null,
			accounts: [systemAccount(1_000_000n)]
		});

		await expect(simulateSolTransactionPreview(params(message([])))).resolves.toBeUndefined();
	});
});
