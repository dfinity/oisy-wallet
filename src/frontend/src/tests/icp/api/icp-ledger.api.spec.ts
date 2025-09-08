import { icrc1Transfer, transfer } from '$icp/api/icp-ledger.api';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import {
	mockAccountIdentifierText,
	mockIdentity,
	mockPrincipal2,
	mockPrincipalText2
} from '$tests/mocks/identity.mock';
import { AccountIdentifier, LedgerCanister, type BlockHeight } from '@dfinity/ledger-icp';
import type { IcrcAccount, IcrcBlockIndex } from '@dfinity/ledger-icrc';
import { toNullable } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

vi.mock('$icp/utils/date.utils', () => ({
	nowInBigIntNanoSeconds: vi.fn()
}));

describe('icp-ledger.api', () => {
	const ledgerCanisterMock = mock<LedgerCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(LedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
	});

	describe('transfer', () => {
		const amount = 1_000_000n;

		const params = {
			to: mockAccountIdentifierText,
			amount,
			identity: mockIdentity,
			ledgerCanisterId: mockLedgerCanisterId
		};

		const mockBlock: BlockHeight = 123n;

		beforeEach(() => {
			ledgerCanisterMock.transfer.mockResolvedValue(mockBlock);
		});

		it('successfully calls transfer endpoint', async () => {
			const result = await transfer(params);

			expect(result).toEqual(mockBlock);

			expect(ledgerCanisterMock.transfer).toHaveBeenCalledOnce();
			expect(ledgerCanisterMock.transfer).toHaveBeenCalledWith({
				amount,
				to: AccountIdentifier.fromHex(mockAccountIdentifierText)
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(transfer({ ...params, identity: undefined })).rejects.toThrow();
		});

		it('throws an error if provided "to" string is not a valid AccountIdentifier', async () => {
			await expect(transfer({ ...params, to: mockPrincipalText2 })).rejects.toThrow();
		});
	});

	describe('icrc1Transfer', () => {
		const to: IcrcAccount = {
			owner: mockPrincipal2
		};

		const toAccount = {
			owner: mockPrincipal2,
			subaccount: toNullable()
		};

		const amount = 1_000_000n;

		const createdAt = 123_456_789n;

		const params = {
			to,
			amount,
			identity: mockIdentity,
			createdAt,
			ledgerCanisterId: mockLedgerCanisterId
		};

		const mockIndex: IcrcBlockIndex = 123n;

		beforeEach(() => {
			ledgerCanisterMock.icrc1Transfer.mockResolvedValue(mockIndex);
		});

		it('successfully calls icrc1Transfer endpoint', async () => {
			const result = await icrc1Transfer(params);

			expect(result).toEqual(mockIndex);

			expect(ledgerCanisterMock.icrc1Transfer).toHaveBeenCalledOnce();
			expect(ledgerCanisterMock.icrc1Transfer).toHaveBeenCalledWith({
				amount,
				to: toAccount,
				createdAt
			});
		});

		it('successfully calls icrc1Transfer endpoint without createdAt', async () => {
			vi.mocked(nowInBigIntNanoSeconds).mockReturnValue(987_654_321n);

			const result = await icrc1Transfer({ ...params, createdAt: undefined });

			expect(result).toEqual(mockIndex);

			expect(ledgerCanisterMock.icrc1Transfer).toHaveBeenCalledOnce();
			expect(ledgerCanisterMock.icrc1Transfer).toHaveBeenCalledWith({
				amount,
				to: toAccount,
				createdAt: 987_654_321n
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(icrc1Transfer({ ...params, identity: undefined })).rejects.toThrow();
		});
	});
});
