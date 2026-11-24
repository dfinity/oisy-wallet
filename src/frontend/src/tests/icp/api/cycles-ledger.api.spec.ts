import { CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { withdrawCycles } from '$icp/api/cycles-ledger.api';
import { CyclesLedgerCanister } from '$icp/canisters/cycles-ledger.canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('cycles-ledger.api', () => {
	const cyclesLedgerCanisterMock = mock<CyclesLedgerCanister>();

	const to = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(CyclesLedgerCanister, 'create').mockResolvedValue(cyclesLedgerCanisterMock);
	});

	describe('withdrawCycles', () => {
		it('should withdraw through the cycles ledger', async () => {
			cyclesLedgerCanisterMock.withdraw.mockResolvedValue(7n);

			await expect(
				withdrawCycles({ identity: mockIdentity, to, amount: 5n, createdAt: 9n })
			).resolves.toBe(7n);
			expect(cyclesLedgerCanisterMock.withdraw).toHaveBeenCalledExactlyOnceWith({
				to,
				amount: 5n,
				createdAt: 9n
			});
			expect(CyclesLedgerCanister.create).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: Principal.fromText(CYCLES_LEDGER_CANISTER_ID)
			});
		});

		it('should build a client for every call, so a withdrawal always runs as the current identity', async () => {
			cyclesLedgerCanisterMock.withdraw.mockResolvedValue(7n);

			await withdrawCycles({ identity: mockIdentity, to, amount: 1n, createdAt: 1n });
			await withdrawCycles({ identity: mockIdentity, to, amount: 1n, createdAt: 2n });

			expect(CyclesLedgerCanister.create).toHaveBeenCalledTimes(2);
		});

		it('should throw if identity is undefined', async () => {
			await expect(
				withdrawCycles({ identity: undefined, to, amount: 1n, createdAt: 1n })
			).rejects.toThrow();
		});
	});
});
