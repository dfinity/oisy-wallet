import {
	IC_CKBTC_MINTER_CANISTER_ID,
	IC_CKETH_LEDGER_CANISTER_ID,
	IC_CKETH_MINTER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { eip1559TransactionPrice, withdrawErc20, withdrawEth } from '$icp/api/cketh-minter.api';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	CkETHMinterCanister,
	type Eip1559TransactionPrice,
	type RetrieveErc20Request,
	type RetrieveEthRequest
} from '@dfinity/cketh';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

vi.mock('$icp/utils/date.utils', () => ({
	nowInBigIntNanoSeconds: vi.fn()
}));

describe('cketh-minter.api', () => {
	const canisterMock = mock<CkETHMinterCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(CkETHMinterCanister, 'create').mockImplementation(() => canisterMock);
	});

	describe('withdrawEth', () => {
		const amount = 123_456_789n;

		const params = {
			identity: mockIdentity,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID,
			amount,
			address: mockEthAddress
		};

		const expected: RetrieveEthRequest = { block_index: 123n };

		beforeEach(() => {
			canisterMock.withdrawEth.mockResolvedValue(expected);
		});

		it('successfully calls withdrawEth endpoint', async () => {
			const result = await withdrawEth(params);

			expect(result).toEqual(expected);

			expect(canisterMock.withdrawEth).toHaveBeenCalledOnce();
			expect(canisterMock.withdrawEth).toHaveBeenCalledWith({
				amount,
				address: mockEthAddress
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(withdrawEth({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('withdrawErc20', () => {
		const amount = 123_456_789n;

		const params = {
			identity: mockIdentity,
			ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
			minterCanisterId: IC_CKETH_MINTER_CANISTER_ID,
			amount,
			address: mockEthAddress
		};

		const expected: RetrieveErc20Request = { ckerc20_block_index: 123n, cketh_block_index: 456n };

		beforeEach(() => {
			canisterMock.withdrawErc20.mockResolvedValue(expected);
		});

		it('successfully calls withdrawErc20 endpoint', async () => {
			const result = await withdrawErc20(params);

			expect(result).toEqual(expected);

			expect(canisterMock.withdrawErc20).toHaveBeenCalledOnce();
			expect(canisterMock.withdrawErc20).toHaveBeenCalledWith({
				amount,
				address: mockEthAddress,
				ledgerCanisterId: Principal.fromText(IC_CKETH_LEDGER_CANISTER_ID)
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(withdrawErc20({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('eip1559TransactionPrice', () => {
		const ckErc20LedgerId = Principal.fromText(mockLedgerCanisterId);

		const params = {
			identity: mockIdentity,
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
			ckErc20LedgerId,
			certified: true
		};

		const expected: Eip1559TransactionPrice = {
			max_priority_fee_per_gas: 123n,
			max_fee_per_gas: 456n,
			max_transaction_fee: 789n,
			timestamp: toNullable(123_456_789n),
			gas_limit: 10_000n
		};

		beforeEach(() => {
			canisterMock.eip1559TransactionPrice.mockResolvedValue(expected);
		});

		it('successfully calls eip1559TransactionPrice endpoint', async () => {
			const result = await eip1559TransactionPrice(params);

			expect(result).toEqual(expected);

			expect(canisterMock.eip1559TransactionPrice).toHaveBeenCalledOnce();
			expect(canisterMock.eip1559TransactionPrice).toHaveBeenCalledWith({
				ckErc20LedgerId,
				certified: true
			});
		});

		it('successfully calls eip1559TransactionPrice endpoint with no ckErc20LedgerId', async () => {
			const result = await eip1559TransactionPrice({ ...params, ckErc20LedgerId: undefined });

			expect(result).toEqual(expected);

			expect(canisterMock.eip1559TransactionPrice).toHaveBeenCalledOnce();
			expect(canisterMock.eip1559TransactionPrice).toHaveBeenCalledWith({ certified: true });
		});

		it('successfully calls getMinterInfo endpoint as query', async () => {
			const result = await eip1559TransactionPrice({ ...params, certified: false });

			expect(result).toEqual(expected);

			expect(canisterMock.eip1559TransactionPrice).toHaveBeenCalledOnce();
			expect(canisterMock.eip1559TransactionPrice).toHaveBeenCalledWith({
				ckErc20LedgerId,
				certified: false
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(eip1559TransactionPrice({ ...params, identity: undefined })).rejects.toThrow();
		});
	});
});
