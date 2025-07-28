import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { getCaseSensitiveness } from '$lib/utils/address.utils';
import { getRecordValueByCaseSensitivity } from '$lib/utils/record.utils';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';

vi.mock('$lib/utils/address.utils', () => ({
	getCaseSensitiveness: vi.fn()
}));

describe('record.utils', () => {
	describe('getRecordValueByCaseSensitivity', () => {
		const mockRecord = {
			[mockSolAddress]: { value: 100n },
			[mockEthAddress]: { value: 200n },
			[mockSolAddress2]: { value: 300n },
			[mockEthAddress2.toUpperCase()]: { value: 400n }
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should get the case sensitiveness for the network', () => {
			getRecordValueByCaseSensitivity({
				record: mockRecord,
				address: mockEthAddress,
				networkId: ETHEREUM_NETWORK_ID
			});

			getRecordValueByCaseSensitivity({
				record: mockRecord,
				address: mockEthAddress,
				networkId: SOLANA_MAINNET_NETWORK_ID
			});

			expect(getCaseSensitiveness).toHaveBeenCalledTimes(2);
			expect(getCaseSensitiveness).toHaveBeenNthCalledWith(1, { networkId: ETHEREUM_NETWORK_ID });
			expect(getCaseSensitiveness).toHaveBeenNthCalledWith(2, {
				networkId: SOLANA_MAINNET_NETWORK_ID
			});
		});

		it('should return the value for a case-sensitive address', () => {
			vi.mocked(getCaseSensitiveness).mockReturnValue(true);

			const result = getRecordValueByCaseSensitivity({
				record: mockRecord,
				address: mockEthAddress,
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(result).toBeDefined();
			expect(result).toEqual(mockRecord[mockEthAddress]);
		});

		it('should return undefined for a case-sensitive address if not matched', () => {
			vi.mocked(getCaseSensitiveness).mockReturnValue(true);

			const result = getRecordValueByCaseSensitivity({
				record: mockRecord,
				address: mockEthAddress2.toLowerCase(),
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(result).toBeUndefined();
		});

		it('should return the value for a case-insensitive address', () => {
			vi.mocked(getCaseSensitiveness).mockReturnValue(false);

			const result = getRecordValueByCaseSensitivity({
				record: mockRecord,
				address: mockEthAddress2.toLowerCase(),
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(result).toBeDefined();
			expect(result).toEqual(mockRecord[mockEthAddress2.toUpperCase()]);
		});

		it('should return undefined for a case-insensitive address if not matched', () => {
			vi.mocked(getCaseSensitiveness).mockReturnValue(false);

			const result = getRecordValueByCaseSensitivity({
				// @ts-expect-error we test this in purposes
				record: mockRecord,
				address: mockEthAddress3,
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(result).toBeUndefined();
		});
	});
});
