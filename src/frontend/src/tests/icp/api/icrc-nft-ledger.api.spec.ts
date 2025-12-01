import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { icrc10SupportedStandards } from '$icp/api/icrc-nft-ledger.api';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { IcrcLedgerCanister } from '@icp-sdk/canisters/ledger/icrc';
import { mock } from 'vitest-mock-extended';

describe('icrc-nft-ledger.api', () => {
	const ledgerCanisterMock = mock<IcrcLedgerCanister>();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(IcrcLedgerCanister, 'create').mockImplementation(() => ledgerCanisterMock);
	});

	describe('icrc10SupportedStandards', () => {
		const params = {
			certified: true,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
			identity: mockIdentity
		};

		const supportedStandards = [
			{ name: 'ICRC-7', url: 'https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-7' }
		];

		beforeEach(() => {
			ledgerCanisterMock.icrc10SupportedStandards.mockResolvedValue(supportedStandards);
		});

		it('successfully calls icrc10SupportedStandards endpoint', async () => {
			const result = await icrc10SupportedStandards(params);

			expect(result).toEqual(supportedStandards);

			expect(ledgerCanisterMock.icrc10SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				certified: true
			});
		});

		it('successfully calls icrc10SupportedStandards endpoint as query', async () => {
			const result = await icrc10SupportedStandards({ ...params, certified: false });

			expect(result).toEqual(supportedStandards);

			expect(ledgerCanisterMock.icrc10SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				certified: false
			});
		});

		it('throws an error if identity is undefined', async () => {
			await expect(icrc10SupportedStandards({ ...params, identity: undefined })).rejects.toThrow();
		});
	});
});
