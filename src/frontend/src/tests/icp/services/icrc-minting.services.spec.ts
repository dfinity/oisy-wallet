import * as icrcLedgerApi from '$icp/api/icrc-ledger.api';
import { getMintingAccount } from '$icp/api/icrc-ledger.api';
import { isUserMintingAccount } from '$icp/services/icrc-minting.services';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIcrcAccount, mockIdentity } from '$tests/mocks/identity.mock';

describe('icrc-minting.services', () => {
	describe('isUserMintingAccount', () => {
		const { mintingAccount: _, ...mockToken } = mockValidIcrcToken;

		const params = {
			identity: mockIdentity,
			account: mockIcrcAccount,
			token: mockToken
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(icrcLedgerApi, 'getMintingAccount').mockResolvedValue(mockIcrcAccount);
		});

		it('should return false if identity is nullish', async () => {
			await expect(isUserMintingAccount({ ...params, identity: undefined })).resolves.toBeFalsy();

			await expect(isUserMintingAccount({ ...params, identity: null })).resolves.toBeFalsy();
		});

		it('should return false if account is nullish', async () => {
			await expect(isUserMintingAccount({ ...params, account: undefined })).resolves.toBeFalsy();
		});

		it('should return false if minting account service returns a nullish account', async () => {
			vi.spyOn(icrcLedgerApi, 'getMintingAccount').mockResolvedValueOnce(undefined);

			await expect(isUserMintingAccount(params)).resolves.toBeFalsy();
		});

		it('should return true if account matches minting account', async () => {
			await expect(isUserMintingAccount(params)).resolves.toBeTruthy();
		});

		it('should return false if account does not match minting account', async () => {
			vi.spyOn(icrcLedgerApi, 'getMintingAccount').mockResolvedValueOnce({
				...mockIcrcAccount,
				subaccount: new Uint8Array([1, 2, 3])
			});

			await expect(isUserMintingAccount(params)).resolves.toBeFalsy();
		});

		it('should call getMintingAccount with correct parameters', async () => {
			await isUserMintingAccount(params);

			expect(getMintingAccount).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: mockToken.ledgerCanisterId
			});
		});

		it('should raise if getMintingAccount throws an error', async () => {
			const error = new Error('Test error');
			vi.spyOn(icrcLedgerApi, 'getMintingAccount').mockRejectedValueOnce(error);

			await expect(isUserMintingAccount(params)).rejects.toThrowError(error);
		});

		it('should work with subaccounts in IcrcAccount', async () => {
			const subaccount = new Uint8Array([10, 20, 30, 40]);
			vi.spyOn(icrcLedgerApi, 'getMintingAccount').mockResolvedValueOnce({
				...mockIcrcAccount,
				subaccount
			});

			await expect(
				isUserMintingAccount({ ...params, account: { ...mockIcrcAccount, subaccount } })
			).resolves.toBeTruthy();
		});

		it('should not call getMintingAccount if minting account is already in the token information', async () => {
			await isUserMintingAccount({ ...params, token: mockValidIcrcToken });

			expect(getMintingAccount).not.toHaveBeenCalled();
		});
	});
});
