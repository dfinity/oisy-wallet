import type {
	_SERVICE as CkSolMinterService,
	DepositSolStatus,
	MinterInfo,
	WatchDepositAddressOk,
	WithdrawSolStatus
} from '$declarations/cksol_minter/cksol_minter.did';
import { CkSolMinterCanister } from '$icp/canisters/cksol-minter.canister';
import {
	CkSolWatchDepositAddressError,
	CkSolWithdrawSolError
} from '$icp/canisters/cksol-minter.errors';
import { ZERO } from '$lib/constants/app.constants';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('cksol-minter.canister', () => {
	const service = mock<ActorSubclass<CkSolMinterService>>();
	const certifiedService = mock<ActorSubclass<CkSolMinterService>>();

	const createCkSolMinterCanister = (): Promise<CkSolMinterCanister> =>
		CkSolMinterCanister.create({
			canisterId: Principal.fromText('lh22c-kyaaa-aaaar-qb5nq-cai'),
			identity: mockIdentity,
			serviceOverride: service,
			certifiedServiceOverride: certifiedService
		});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getMinterInfo', () => {
		const minterInfo: MinterInfo = {
			deposit_sol_fee: 45_000_000_000n,
			balance: 995_500n,
			withdrawal_fee: 1_000_000n,
			minimum_deposit_amount: 20_000_000n,
			deposit_sol_required_cycles: 1_000_000_000_000n,
			nonce_accounts: ['G2VedB18ZtzqwwGX6waEGWgXi21GqQ4CLr7JHvhvDGk'],
			minimum_withdrawal_amount: 2_000_000n,
			minter_address: ['GXVewvv6HehcLFYCmwpqh5CrMjqN9zJ8rqzGq3HEt9Ax'],
			automatic_deposit_fee: [],
			collected_automatic_deposit_fees: []
		};

		it('should read the minter info as a query', async () => {
			service.get_minter_info.mockResolvedValue(minterInfo);

			const { getMinterInfo } = await createCkSolMinterCanister();

			await expect(getMinterInfo({ certified: false })).resolves.toEqual(minterInfo);
			expect(service.get_minter_info).toHaveBeenCalledOnce();
			expect(certifiedService.get_minter_info).not.toHaveBeenCalled();
		});

		it('should ask the certified service when certified', async () => {
			certifiedService.get_minter_info.mockResolvedValue(minterInfo);

			const { getMinterInfo } = await createCkSolMinterCanister();

			await expect(getMinterInfo({ certified: true })).resolves.toEqual(minterInfo);
			expect(certifiedService.get_minter_info).toHaveBeenCalledOnce();
			expect(service.get_minter_info).not.toHaveBeenCalled();
		});
	});

	describe('getDepositAddress', () => {
		it('should ask for the default account of the owner, as an update', async () => {
			certifiedService.get_deposit_address.mockResolvedValue(
				'Br8eRkeya8hy3sHCYqtWqGeNNZ349aPSUKGVYFWKKer1'
			);

			const { getDepositAddress } = await createCkSolMinterCanister();

			await expect(getDepositAddress({ owner: mockPrincipal })).resolves.toBe(
				'Br8eRkeya8hy3sHCYqtWqGeNNZ349aPSUKGVYFWKKer1'
			);
			expect(certifiedService.get_deposit_address).toHaveBeenCalledExactlyOnceWith({
				owner: [mockPrincipal],
				subaccount: []
			});
			expect(service.get_deposit_address).not.toHaveBeenCalled();
		});
	});

	describe('depositSolStatus', () => {
		const status: DepositSolStatus = {
			Minted: { block_index: 12n, minted_amount: 997_104_120n }
		};

		it('should read the status of the deposit as a query', async () => {
			service.deposit_sol_status.mockResolvedValue(status);

			const { depositSolStatus } = await createCkSolMinterCanister();

			await expect(depositSolStatus({ depositId: 42n, certified: false })).resolves.toEqual(status);
			expect(service.deposit_sol_status).toHaveBeenCalledExactlyOnceWith(42n);
			expect(certifiedService.deposit_sol_status).not.toHaveBeenCalled();
		});

		it('should ask the certified service when certified', async () => {
			certifiedService.deposit_sol_status.mockResolvedValue(status);

			const { depositSolStatus } = await createCkSolMinterCanister();

			await expect(depositSolStatus({ depositId: 42n, certified: true })).resolves.toEqual(status);
			expect(certifiedService.deposit_sol_status).toHaveBeenCalledExactlyOnceWith(42n);
			expect(service.deposit_sol_status).not.toHaveBeenCalled();
		});
	});

	describe('watchDepositAddress', () => {
		const watched: WatchDepositAddressOk = {
			address: 'Br8eRkeya8hy3sHCYqtWqGeNNZ349aPSUKGVYFWKKer1',
			minimum_deposit_amount: 20_000_000n,
			automatic_deposit_fee: 2_000_000n,
			status: {
				Watching: {
					valid_until: 1_794_500_000_000_000_000n,
					scan_count: 0,
					last_scanned_at: [],
					next_scan_at: [1_794_413_660_000_000_000n]
				}
			},
			latest_deposit_id: [41n]
		};

		it('should register the default account of the caller, as an update', async () => {
			certifiedService.watch_deposit_address.mockResolvedValue({ Ok: watched });

			const { watchDepositAddress } = await createCkSolMinterCanister();

			await expect(watchDepositAddress()).resolves.toEqual(watched);
			expect(certifiedService.watch_deposit_address).toHaveBeenCalledExactlyOnceWith({
				subaccount: []
			});
			expect(service.watch_deposit_address).not.toHaveBeenCalled();
		});

		it('should throw the minter refusal with its answer', async () => {
			const refusal = { Quarantined: { deposit_id: 41n } };

			certifiedService.watch_deposit_address.mockResolvedValue({ Err: refusal });

			const { watchDepositAddress } = await createCkSolMinterCanister();

			const promise = watchDepositAddress();

			await expect(promise).rejects.toBeInstanceOf(CkSolWatchDepositAddressError);
			await expect(promise).rejects.toMatchObject({ error: refusal });
		});
	});

	describe('withdrawSol', () => {
		const params = {
			address: '6TqNg48mSd5evmY66JVfGeGTwszrU1YLCeSw3GJ2qsUC',
			amount: 2_000_000n
		};

		it('should withdraw from the default account, as an update, and return the burn index', async () => {
			certifiedService.withdraw_sol.mockResolvedValue({ Ok: { block_index: 7n } });

			const { withdrawSol } = await createCkSolMinterCanister();

			await expect(withdrawSol(params)).resolves.toEqual({ block_index: 7n });
			expect(certifiedService.withdraw_sol).toHaveBeenCalledExactlyOnceWith({
				...params,
				from_subaccount: []
			});
			expect(service.withdraw_sol).not.toHaveBeenCalled();
		});

		it('should throw the minter refusal with its answer', async () => {
			const refusal = { InsufficientAllowance: { allowance: ZERO } };

			certifiedService.withdraw_sol.mockResolvedValue({ Err: refusal });

			const { withdrawSol } = await createCkSolMinterCanister();

			const promise = withdrawSol(params);

			await expect(promise).rejects.toBeInstanceOf(CkSolWithdrawSolError);
			await expect(promise).rejects.toMatchObject({ error: refusal });
		});
	});

	describe('withdrawSolStatus', () => {
		it('should read the status of the withdrawal by its burn index, as an update', async () => {
			const status: WithdrawSolStatus = {
				TxFinalized: {
					Success: {
						transaction_id:
							'5LrcE2f6uvydKRquEJ8xp19heGxSvqsVbcqUeFoiWbXe8JNip7ftPQNTAVPyTK7ijVdpkzmKKaAQR7MWMmujAhXD'
					}
				}
			};

			certifiedService.withdraw_sol_status.mockResolvedValue(status);

			const { withdrawSolStatus } = await createCkSolMinterCanister();

			await expect(withdrawSolStatus({ blockIndex: 7n })).resolves.toEqual(status);
			expect(certifiedService.withdraw_sol_status).toHaveBeenCalledExactlyOnceWith({
				block_index: 7n
			});
			expect(service.withdraw_sol_status).not.toHaveBeenCalled();
		});
	});
});
