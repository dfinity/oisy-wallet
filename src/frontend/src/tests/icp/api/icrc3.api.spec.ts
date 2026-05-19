import { getArchives, getBlocks, getTipCertificate, supportedBlockTypes } from '$icp/api/icrc3.api';
import { Icrc3Canister } from '$icp/canisters/icrc3.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { mock } from 'vitest-mock-extended';

describe('icrc3.api', () => {
	const canisterMock = mock<Icrc3Canister>();

	const params = {
		identity: mockIdentity,
		canisterId: mockLedgerCanisterId
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(Icrc3Canister, 'create').mockResolvedValue(canisterMock);
	});

	describe('getArchives', () => {
		it('should call getArchives successfully', async () => {
			const archives = [{ canister_id: mockPrincipal, start: ZERO, end: 10n }];
			canisterMock.getArchives.mockResolvedValue(archives);

			await expect(getArchives({ ...params, from: mockPrincipal })).resolves.toEqual(archives);
			expect(canisterMock.getArchives).toHaveBeenCalledExactlyOnceWith({
				from: mockPrincipal
			});
		});
	});

	describe('getBlocks', () => {
		it('should call getBlocks successfully', async () => {
			const args = [{ start: ZERO, length: 1n }];
			const response = { log_length: 1n, blocks: [], archived_blocks: [] };
			canisterMock.getBlocks.mockResolvedValue(response);

			await expect(getBlocks({ ...params, args })).resolves.toEqual(response);
			expect(canisterMock.getBlocks).toHaveBeenCalledExactlyOnceWith({ args });
		});
	});

	describe('getTipCertificate', () => {
		it('should call getTipCertificate successfully', async () => {
			const certificate = {
				certificate: new Uint8Array([1]),
				hash_tree: new Uint8Array([2])
			};
			canisterMock.getTipCertificate.mockResolvedValue(certificate);

			await expect(getTipCertificate(params)).resolves.toEqual(certificate);
			expect(canisterMock.getTipCertificate).toHaveBeenCalledExactlyOnceWith({});
		});
	});

	describe('supportedBlockTypes', () => {
		it('should call supportedBlockTypes successfully', async () => {
			const blockTypes = [{ block_type: '7xfer', url: 'https://github.com/dfinity/ICRC' }];
			canisterMock.supportedBlockTypes.mockResolvedValue(blockTypes);

			await expect(supportedBlockTypes(params)).resolves.toEqual(blockTypes);
			expect(canisterMock.supportedBlockTypes).toHaveBeenCalledExactlyOnceWith({});
		});

		it('should throw when the canister call fails', async () => {
			const err = new CanisterInternalError('Failed');
			canisterMock.supportedBlockTypes.mockRejectedValue(err);

			await expect(supportedBlockTypes(params)).rejects.toThrow(err);
		});
	});
});
