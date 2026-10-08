import { getBlocks } from '$icp/api/icrc3.api';
import { loadIcrc3BlockLog } from '$icp/services/icrc3.services';
import { ZERO } from '$lib/constants/app.constants';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';

vi.mock('$icp/api/icrc3.api', () => ({
	getBlocks: vi.fn()
}));

describe('icrc3.services', () => {
	describe('loadIcrc3BlockLog', () => {
		const params = {
			identity: mockIdentity,
			canisterId: mockLedgerCanisterId,
			start: ZERO,
			length: 10n
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should load local blocks from the ledger canister', async () => {
			vi.mocked(getBlocks).mockResolvedValue({
				log_length: 2n,
				blocks: [
					{ id: 1n, block: { Map: [['btype', { Text: '7xfer' }]] } },
					{ id: ZERO, block: { Map: [['btype', { Text: '7mint' }]] } }
				],
				archived_blocks: []
			});

			await expect(loadIcrc3BlockLog(params)).resolves.toEqual({
				logLength: 2n,
				blocks: [
					{ id: ZERO, block: { Map: [['btype', { Text: '7mint' }]] } },
					{ id: 1n, block: { Map: [['btype', { Text: '7xfer' }]] } }
				]
			});

			expect(getBlocks).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				canisterId: mockLedgerCanisterId,
				certified: undefined,
				args: [{ start: ZERO, length: 10n }]
			});
		});

		it('should sort block ids without number coercion', async () => {
			const largeBlockId = BigInt(Number.MAX_SAFE_INTEGER) + 1n;

			vi.mocked(getBlocks).mockResolvedValue({
				log_length: 2n,
				blocks: [
					{ id: largeBlockId + 1n, block: { Map: [['btype', { Text: '7burn' }]] } },
					{ id: largeBlockId, block: { Map: [['btype', { Text: '7mint' }]] } }
				],
				archived_blocks: []
			});

			await expect(loadIcrc3BlockLog(params)).resolves.toEqual({
				logLength: 2n,
				blocks: [
					{ id: largeBlockId, block: { Map: [['btype', { Text: '7mint' }]] } },
					{ id: largeBlockId + 1n, block: { Map: [['btype', { Text: '7burn' }]] } }
				]
			});
		});

		it('should load archived block ranges when callback method is icrc3_get_blocks', async () => {
			vi.mocked(getBlocks)
				.mockResolvedValueOnce({
					log_length: 3n,
					blocks: [{ id: 2n, block: { Map: [['btype', { Text: '7burn' }]] } }],
					archived_blocks: [
						{
							args: [{ start: ZERO, length: 2n }],
							callback: [mockPrincipal, 'icrc3_get_blocks']
						}
					]
				})
				.mockResolvedValueOnce({
					log_length: 2n,
					blocks: [
						{ id: ZERO, block: { Map: [['btype', { Text: '7mint' }]] } },
						{ id: 1n, block: { Map: [['btype', { Text: '7xfer' }]] } }
					],
					archived_blocks: []
				});

			await expect(loadIcrc3BlockLog(params)).resolves.toEqual({
				logLength: 3n,
				blocks: [
					{ id: ZERO, block: { Map: [['btype', { Text: '7mint' }]] } },
					{ id: 1n, block: { Map: [['btype', { Text: '7xfer' }]] } },
					{ id: 2n, block: { Map: [['btype', { Text: '7burn' }]] } }
				]
			});

			expect(getBlocks).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				canisterId: mockPrincipal.toText(),
				certified: undefined,
				args: [{ start: ZERO, length: 2n }]
			});
		});

		it('should ignore unsupported archive callback methods', async () => {
			vi.mocked(getBlocks).mockResolvedValue({
				log_length: 1n,
				blocks: [{ id: ZERO, block: { Map: [] } }],
				archived_blocks: [
					{
						args: [{ start: ZERO, length: 1n }],
						callback: [mockPrincipal, 'custom_get_blocks']
					}
				]
			});

			await expect(loadIcrc3BlockLog(params)).resolves.toEqual({
				logLength: 1n,
				blocks: [{ id: ZERO, block: { Map: [] } }]
			});

			expect(getBlocks).toHaveBeenCalledOnce();
		});
	});
});
