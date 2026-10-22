import type { _SERVICE as CyclesLedgerService } from '$declarations/cycles_ledger/cycles_ledger.did';
import { CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { CyclesLedgerCanister } from '$icp/canisters/cycles-ledger.canister';
import {
	CyclesLedgerWithdrawDuplicateError,
	CyclesLedgerWithdrawFailedError
} from '$icp/canisters/cycles-ledger.errors';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('cycles-ledger.canister', () => {
	const service = mock<ActorSubclass<CyclesLedgerService>>();
	const certifiedService = mock<ActorSubclass<CyclesLedgerService>>();

	const to = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

	const createCyclesLedgerCanister = (): Promise<CyclesLedgerCanister> =>
		CyclesLedgerCanister.create({
			canisterId: Principal.fromText(CYCLES_LEDGER_CANISTER_ID),
			identity: mockIdentity,
			serviceOverride: service,
			certifiedServiceOverride: certifiedService
		});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('withdraw', () => {
		it('should withdraw from the default account with the creation time, as an update, and return the block', async () => {
			certifiedService.withdraw.mockResolvedValue({ Ok: 7n });

			const { withdraw } = await createCyclesLedgerCanister();

			await expect(
				withdraw({ to, amount: 1_000_000_000_000n, createdAt: 1_790_000_000_000_000_000n })
			).resolves.toBe(7n);
			expect(certifiedService.withdraw).toHaveBeenCalledExactlyOnceWith({
				to,
				amount: 1_000_000_000_000n,
				from_subaccount: [],
				created_at_time: [1_790_000_000_000_000_000n]
			});
			expect(service.withdraw).not.toHaveBeenCalled();
		});

		it('should throw the mapped error when the ledger answers Duplicate', async () => {
			certifiedService.withdraw.mockResolvedValue({ Err: { Duplicate: { duplicate_of: 6n } } });

			const { withdraw } = await createCyclesLedgerCanister();

			await expect(withdraw({ to, amount: 1n, createdAt: 1n })).rejects.toBeInstanceOf(
				CyclesLedgerWithdrawDuplicateError
			);
		});

		it('should throw the mapped error when the deposit fails', async () => {
			certifiedService.withdraw.mockResolvedValue({
				Err: {
					FailedToWithdraw: {
						rejection_code: { DestinationInvalid: null },
						fee_block: [8n],
						rejection_reason: 'Canister not found'
					}
				}
			});

			const { withdraw } = await createCyclesLedgerCanister();

			await expect(withdraw({ to, amount: 1n, createdAt: 1n })).rejects.toBeInstanceOf(
				CyclesLedgerWithdrawFailedError
			);
		});
	});
});
