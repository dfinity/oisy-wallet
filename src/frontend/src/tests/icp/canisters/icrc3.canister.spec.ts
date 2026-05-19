import type { _SERVICE as Icrc3Service } from '$declarations/icrc3/icrc3.did';
import { Icrc3Canister } from '$icp/canisters/icrc3.canister';
import { ZERO } from '$lib/constants/app.constants';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('icrc3.canister', () => {
	const certified = false;

	const createIcrc3Canister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<Icrc3Service>, 'serviceOverride'>): Promise<Icrc3Canister> =>
		Icrc3Canister.create({
			canisterId: Principal.fromText(mockLedgerCanisterId),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<Icrc3Service>>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getArchives', () => {
		it('should call icrc3_get_archives without a cursor', async () => {
			const archives = [{ canister_id: mockPrincipal, start: ZERO, end: 10n }];
			service.icrc3_get_archives.mockResolvedValue(archives);

			const { getArchives } = await createIcrc3Canister({ serviceOverride: service });

			await expect(getArchives({ certified })).resolves.toEqual(archives);
			expect(service.icrc3_get_archives).toHaveBeenCalledExactlyOnceWith({ from: [] });
		});

		it('should pass the archive cursor when provided', async () => {
			service.icrc3_get_archives.mockResolvedValue([]);

			const { getArchives } = await createIcrc3Canister({ serviceOverride: service });

			await getArchives({ certified, from: mockPrincipal });

			expect(service.icrc3_get_archives).toHaveBeenCalledExactlyOnceWith({
				from: [mockPrincipal]
			});
		});
	});

	describe('getBlocks', () => {
		it('should call icrc3_get_blocks with the provided block ranges', async () => {
			const args = [{ start: ZERO, length: 2n }];
			const response = {
				log_length: 2n,
				blocks: [{ id: ZERO, block: { Map: [] } }],
				archived_blocks: []
			};
			service.icrc3_get_blocks.mockResolvedValue(response);

			const { getBlocks } = await createIcrc3Canister({ serviceOverride: service });

			await expect(getBlocks({ certified, args })).resolves.toEqual(response);
			expect(service.icrc3_get_blocks).toHaveBeenCalledExactlyOnceWith(args);
		});
	});

	describe('getTipCertificate', () => {
		it('should return the optional tip certificate when present', async () => {
			const certificate = {
				certificate: new Uint8Array([1, 2, 3]),
				hash_tree: new Uint8Array([4, 5, 6])
			};
			service.icrc3_get_tip_certificate.mockResolvedValue([certificate]);

			const { getTipCertificate } = await createIcrc3Canister({ serviceOverride: service });

			await expect(getTipCertificate({ certified })).resolves.toEqual(certificate);
			expect(service.icrc3_get_tip_certificate).toHaveBeenCalledExactlyOnceWith();
		});

		it('should return undefined when the tip certificate is absent', async () => {
			service.icrc3_get_tip_certificate.mockResolvedValue([]);

			const { getTipCertificate } = await createIcrc3Canister({ serviceOverride: service });

			await expect(getTipCertificate({ certified })).resolves.toBeUndefined();
		});
	});

	describe('supportedBlockTypes', () => {
		it('should call icrc3_supported_block_types', async () => {
			const blockTypes = [{ block_type: '7xfer', url: 'https://github.com/dfinity/ICRC' }];
			service.icrc3_supported_block_types.mockResolvedValue(blockTypes);

			const { supportedBlockTypes } = await createIcrc3Canister({ serviceOverride: service });

			await expect(supportedBlockTypes({ certified })).resolves.toEqual(blockTypes);
			expect(service.icrc3_supported_block_types).toHaveBeenCalledExactlyOnceWith();
		});
	});
});
