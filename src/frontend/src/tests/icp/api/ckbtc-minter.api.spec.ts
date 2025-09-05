import { IC_CKBTC_MINTER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import {
	estimateFee,
	getBtcAddress,
	getKnownUtxos,
	minterInfo,
	retrieveBtc,
	updateBalance,
	withdrawalStatuses
} from '$icp/api/ckbtc-minter.api';
import { mockBtcAddress, mockUtxo } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	CkBTCMinterCanister,
	type EstimateWithdrawalFee,
	type MinterInfo,
	type RetrieveBtcOk,
	type RetrieveBtcStatusV2WithId,
	type Utxo
} from '@dfinity/ckbtc';
import type { UpdateBalanceOk } from '@dfinity/ckbtc/dist/types/types/minter.responses';
import { mock } from 'vitest-mock-extended';

vi.mock('$icp/utils/date.utils', () => ({
	nowInBigIntNanoSeconds: vi.fn()
}));

describe('ckbtc-minter.api', () => {
	const canisterMock = mock<CkBTCMinterCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(CkBTCMinterCanister, 'create').mockImplementation(() => canisterMock);
	});

	describe('retrieveBtc', () => {
		const amount = 123_456_789n;

		const params = {
			identity: mockIdentity,
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
			amount,
			address: mockBtcAddress
		};

		const expected: RetrieveBtcOk = { block_index: 123n };

		beforeEach(() => {
			canisterMock.retrieveBtcWithApproval.mockResolvedValue(expected);
		});

		it('successfully calls retrieveBtcWithApproval endpoint', async () => {
			const result = await retrieveBtc(params);

			expect(result).toEqual(expected);

			expect(canisterMock.retrieveBtcWithApproval).toHaveBeenCalledOnce();
			expect(canisterMock.retrieveBtcWithApproval).toHaveBeenCalledWith({
				amount,
				address: mockBtcAddress
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(retrieveBtc({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('updateBalance', () => {
		const params = {
			identity: mockIdentity,
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
		};

		const expected: UpdateBalanceOk = [{ ValueTooSmall: mockUtxo }, { Tainted: mockUtxo }];

		beforeEach(() => {
			canisterMock.updateBalance.mockResolvedValue(expected);
		});

		it('successfully calls updateBalance endpoint', async () => {
			const result = await updateBalance(params);

			expect(result).toEqual(expected);

			expect(canisterMock.updateBalance).toHaveBeenCalledOnce();
			expect(canisterMock.updateBalance).toHaveBeenCalledWith({
				owner: mockIdentity.getPrincipal()
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(updateBalance({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('minterInfo', () => {
		const params = {
			identity: mockIdentity,
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
			certified: true
		};

		const expected: MinterInfo = {
			retrieve_btc_min_amount: 123n,
			min_confirmations: 111,
			kyt_fee: 456n
		};

		beforeEach(() => {
			canisterMock.getMinterInfo.mockResolvedValue(expected);
		});

		it('successfully calls getMinterInfo endpoint', async () => {
			const result = await minterInfo(params);

			expect(result).toEqual(expected);

			expect(canisterMock.getMinterInfo).toHaveBeenCalledOnce();
			expect(canisterMock.getMinterInfo).toHaveBeenCalledWith({ certified: true });
		});

		it('successfully calls getMinterInfo endpoint as query', async () => {
			const result = await minterInfo({ ...params, certified: false });

			expect(result).toEqual(expected);

			expect(canisterMock.getMinterInfo).toHaveBeenCalledOnce();
			expect(canisterMock.getMinterInfo).toHaveBeenCalledWith({ certified: false });
		});

		it('throws an error if identity is undefined', async () => {
			await expect(minterInfo({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('getBtcAddress', () => {
		const params = {
			identity: mockIdentity,
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
		};

		beforeEach(() => {
			canisterMock.getBtcAddress.mockResolvedValue(mockBtcAddress);
		});

		it('successfully calls getBtcAddress endpoint', async () => {
			const result = await getBtcAddress(params);

			expect(result).toEqual(mockBtcAddress);

			expect(canisterMock.getBtcAddress).toHaveBeenCalledOnce();
			expect(canisterMock.getBtcAddress).toHaveBeenCalledWith({
				owner: mockIdentity.getPrincipal()
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(getBtcAddress({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('estimateFee', () => {
		const amount = 123_456_789n;

		const params = {
			identity: mockIdentity,
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
			amount,
			certified: true
		};

		const expected: EstimateWithdrawalFee = {
			minter_fee: 123n,
			bitcoin_fee: 456n
		};

		beforeEach(() => {
			canisterMock.estimateWithdrawalFee.mockResolvedValue(expected);
		});

		it('successfully calls estimateWithdrawalFee endpoint', async () => {
			const result = await estimateFee(params);

			expect(result).toEqual(expected);

			expect(canisterMock.estimateWithdrawalFee).toHaveBeenCalledOnce();
			expect(canisterMock.estimateWithdrawalFee).toHaveBeenCalledWith({ amount, certified: true });
		});

		it('successfully calls estimateWithdrawalFee endpoint with no amount', async () => {
			const result = await estimateFee({ ...params, amount: undefined });

			expect(result).toEqual(expected);

			expect(canisterMock.estimateWithdrawalFee).toHaveBeenCalledOnce();
			expect(canisterMock.estimateWithdrawalFee).toHaveBeenCalledWith({ certified: true });
		});

		it('successfully calls estimateWithdrawalFee endpoint as query', async () => {
			const result = await estimateFee({ ...params, certified: false });

			expect(result).toEqual(expected);

			expect(canisterMock.estimateWithdrawalFee).toHaveBeenCalledOnce();
			expect(canisterMock.estimateWithdrawalFee).toHaveBeenCalledWith({ amount, certified: false });
		});

		it('throws an error if identity is undefined', async () => {
			await expect(estimateFee({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('withdrawalStatuses', () => {
		const params = {
			identity: mockIdentity,
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID,
			certified: true
		};

		const expected: RetrieveBtcStatusV2WithId[] = [
			{ id: 1n, status: undefined },
			{ id: 2n, status: { AmountTooLow: null } }
		];

		beforeEach(() => {
			canisterMock.retrieveBtcStatusV2ByAccount.mockResolvedValue(expected);
		});

		it('successfully calls retrieveBtcStatusV2ByAccount endpoint', async () => {
			const result = await withdrawalStatuses(params);

			expect(result).toEqual(expected);

			expect(canisterMock.retrieveBtcStatusV2ByAccount).toHaveBeenCalledOnce();
			expect(canisterMock.retrieveBtcStatusV2ByAccount).toHaveBeenCalledWith({ certified: true });
		});

		it('successfully calls retrieveBtcStatusV2ByAccount endpoint as query', async () => {
			const result = await withdrawalStatuses({ ...params, certified: false });

			expect(result).toEqual(expected);

			expect(canisterMock.retrieveBtcStatusV2ByAccount).toHaveBeenCalledOnce();
			expect(canisterMock.retrieveBtcStatusV2ByAccount).toHaveBeenCalledWith({ certified: false });
		});

		it('throws an error if identity is undefined', async () => {
			await expect(withdrawalStatuses({ ...params, identity: undefined })).rejects.toThrow();
		});
	});

	describe('getKnownUtxos', () => {
		const params = {
			identity: mockIdentity,
			minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
		};

		const expected: Utxo[] = [mockUtxo, mockUtxo];

		beforeEach(() => {
			canisterMock.getKnownUtxos.mockResolvedValue(expected);
		});

		it('successfully calls getKnownUtxos endpoint', async () => {
			const result = await getKnownUtxos(params);

			expect(result).toEqual(expected);

			expect(canisterMock.getKnownUtxos).toHaveBeenCalledOnce();
			expect(canisterMock.getKnownUtxos).toHaveBeenCalledWith({
				owner: mockIdentity.getPrincipal()
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(getKnownUtxos({ ...params, identity: undefined })).rejects.toThrow();
		});
	});
});
