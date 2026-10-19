import type { MinterInfo } from '$declarations/cksol_minter/cksol_minter.did';
import {
	depositSolStatus,
	getDepositAddress,
	minterInfo,
	withdrawSol,
	withdrawSolStatus
} from '$icp/api/cksol-minter.api';
import { CkSolMinterCanister } from '$icp/canisters/cksol-minter.canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('cksol-minter.api', () => {
	const minterCanisterId = 'lh22c-kyaaa-aaaar-qb5nq-cai';

	const minterCanisterMock = mock<CkSolMinterCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(CkSolMinterCanister, 'create').mockResolvedValue(minterCanisterMock);
	});

	describe('minterInfo', () => {
		const info: MinterInfo = {
			deposit_sol_fee: 45_000_000_000n,
			balance: 995_500n,
			withdrawal_fee: 1_000_000n,
			minimum_deposit_amount: 20_000_000n,
			deposit_sol_required_cycles: 1_000_000_000_000n,
			nonce_accounts: [],
			minimum_withdrawal_amount: 2_000_000n,
			minter_address: []
		};

		it('should read the minter info from the given minter', async () => {
			minterCanisterMock.getMinterInfo.mockResolvedValue(info);

			await expect(
				minterInfo({ identity: mockIdentity, minterCanisterId, certified: true })
			).resolves.toEqual(info);
			expect(minterCanisterMock.getMinterInfo).toHaveBeenCalledExactlyOnceWith({
				certified: true
			});
			expect(CkSolMinterCanister.create).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: Principal.fromText(minterCanisterId)
			});
		});

		it('should throw if identity is undefined', async () => {
			await expect(
				minterInfo({ identity: undefined, minterCanisterId, certified: true })
			).rejects.toThrow();
		});
	});

	describe('getDepositAddress', () => {
		it("should ask for the deposit address of the identity's principal", async () => {
			minterCanisterMock.getDepositAddress.mockResolvedValue(
				'Br8eRkeya8hy3sHCYqtWqGeNNZ349aPSUKGVYFWKKer1'
			);

			await expect(getDepositAddress({ identity: mockIdentity, minterCanisterId })).resolves.toBe(
				'Br8eRkeya8hy3sHCYqtWqGeNNZ349aPSUKGVYFWKKer1'
			);
			expect(minterCanisterMock.getDepositAddress).toHaveBeenCalledExactlyOnceWith({
				owner: mockIdentity.getPrincipal()
			});
		});

		it('should throw if identity is undefined', async () => {
			await expect(getDepositAddress({ identity: undefined, minterCanisterId })).rejects.toThrow();
		});
	});

	describe('depositSolStatus', () => {
		it('should read the status of the deposit', async () => {
			minterCanisterMock.depositSolStatus.mockResolvedValue({ NotFound: null });

			await expect(
				depositSolStatus({
					identity: mockIdentity,
					minterCanisterId,
					depositId: 42n,
					certified: false
				})
			).resolves.toEqual({ NotFound: null });
			expect(minterCanisterMock.depositSolStatus).toHaveBeenCalledExactlyOnceWith({
				depositId: 42n,
				certified: false
			});
		});

		it('should throw if identity is undefined', async () => {
			await expect(
				depositSolStatus({
					identity: undefined,
					minterCanisterId,
					depositId: 42n,
					certified: false
				})
			).rejects.toThrow();
		});
	});

	describe('withdrawSol', () => {
		const params = {
			address: '6TqNg48mSd5evmY66JVfGeGTwszrU1YLCeSw3GJ2qsUC',
			amount: 2_000_000n
		};

		it('should withdraw through the given minter', async () => {
			minterCanisterMock.withdrawSol.mockResolvedValue({ block_index: 7n });

			await expect(
				withdrawSol({ identity: mockIdentity, minterCanisterId, ...params })
			).resolves.toEqual({ block_index: 7n });
			expect(minterCanisterMock.withdrawSol).toHaveBeenCalledExactlyOnceWith(params);
		});

		it('should build a client for every call, so a withdrawal always runs as the current identity', async () => {
			minterCanisterMock.withdrawSol.mockResolvedValue({ block_index: 7n });

			await withdrawSol({ identity: mockIdentity, minterCanisterId, ...params });
			await withdrawSol({ identity: mockIdentity, minterCanisterId, ...params });

			expect(CkSolMinterCanister.create).toHaveBeenCalledTimes(2);
		});

		it('should throw if identity is undefined', async () => {
			await expect(
				withdrawSol({ identity: undefined, minterCanisterId, ...params })
			).rejects.toThrow();
		});
	});

	describe('withdrawSolStatus', () => {
		it('should read the status of the withdrawal by its burn index', async () => {
			minterCanisterMock.withdrawSolStatus.mockResolvedValue({ Pending: null });

			await expect(
				withdrawSolStatus({ identity: mockIdentity, minterCanisterId, blockIndex: 7n })
			).resolves.toEqual({ Pending: null });
			expect(minterCanisterMock.withdrawSolStatus).toHaveBeenCalledExactlyOnceWith({
				blockIndex: 7n
			});
		});

		it('should throw if identity is undefined', async () => {
			await expect(
				withdrawSolStatus({ identity: undefined, minterCanisterId, blockIndex: 7n })
			).rejects.toThrow();
		});
	});
});
