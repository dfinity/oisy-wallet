import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import * as icrcNftLedgerApi from '$icp/api/icrc-nft-ledger.api';
import { isIcrcTokenSupportIcrc7 } from '$icp/utils/icrc-nft.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { IcrcStandardRecord } from '@dfinity/ledger-icrc';

vi.mock('$icp/api/icrc-nft-ledger.api', () => ({
	icrc10SupportedStandards: vi.fn()
}));

describe('icrc-nft.utils', () => {
	describe('isIcrcTokenSupportIcrc7', () => {
		const params = {
			identity: mockIdentity,
			ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should true when ICRC-7 standard is supported', async () => {
			const supportedStandards: IcrcStandardRecord[] = [
				{ name: 'ICRC-7', url: 'https://github.com/dfinity/ICRC/tree/main/ICRCs/ICRC-7' },
				{ name: 'ICRC-10', url: 'https://github.com/dfinity/ICRC/tree/main/ICRCs/ICRC-10' },
				{ name: 'ICRC-37', url: 'https://github.com/dfinity/ICRC/tree/main/ICRCs/ICRC-37' }
			];

			vi.mocked(icrcNftLedgerApi.icrc10SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc7(params);

			expect(result).toBeTruthy();

			expect(icrcNftLedgerApi.icrc10SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			});
		});

		it('should return false when ICRC-7 standard is not supported', async () => {
			const supportedStandards = [
				{ name: 'ICRC-1', url: 'https://github.com/dfinity/ICRC-1' },
				{ name: 'ICRC-3', url: 'https://github.com/dfinity/ICRC-3' }
			];

			vi.mocked(icrcNftLedgerApi.icrc10SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc7(params);

			expect(result).toBeFalsy();

			expect(icrcNftLedgerApi.icrc10SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			});
		});

		it('should return false when no standards are supported', async () => {
			const supportedStandards: [] = [];

			vi.mocked(icrcNftLedgerApi.icrc10SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc7(params);

			expect(result).toBeFalsy();

			expect(icrcNftLedgerApi.icrc10SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			});
		});

		it('should return true when only ICRC-7 is supported', async () => {
			const supportedStandards = [
				{ name: 'ICRC-7', url: 'https://github.com/dfinity/ICRC/tree/main/ICRCs/ICRC-7' }
			];

			vi.mocked(icrcNftLedgerApi.icrc10SupportedStandards).mockResolvedValue(supportedStandards);

			const result = await isIcrcTokenSupportIcrc7(params);

			expect(result).toBeTruthy();
			expect(icrcNftLedgerApi.icrc10SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			});
		});

		it('should return false when the method icrc10SupportedStandards is not supported', async () => {
			vi.mocked(icrcNftLedgerApi.icrc10SupportedStandards).mockRejectedValue(
				new Error('Method not supported')
			);

			const result = await isIcrcTokenSupportIcrc7(params);

			expect(result).toBeFalsy();

			expect(icrcNftLedgerApi.icrc10SupportedStandards).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
			});
		});
	});
});
