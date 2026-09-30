import type { _SERVICE as IcpIndexService } from '$declarations/icp_index/icp_index.did';
import { ICP_INDEX_CANISTER_ID } from '$env/networks/networks.icp.env';
import { IcpIndexStatusCanister } from '$icp/canisters/icp-index-status.canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('icp-index-status.canister', () => {
	const service = mock<ActorSubclass<IcpIndexService>>();
	const certifiedService = mock<ActorSubclass<IcpIndexService>>();

	const createIcpIndexStatusCanister = (): Promise<IcpIndexStatusCanister> =>
		IcpIndexStatusCanister.create({
			canisterId: Principal.fromText(ICP_INDEX_CANISTER_ID),
			identity: mockIdentity,
			serviceOverride: service,
			certifiedServiceOverride: certifiedService
		});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('numBlocksSynced', () => {
		it('should return how many blocks the index has synced, as a query', async () => {
			service.status.mockResolvedValue({ num_blocks_synced: 123n });

			const { numBlocksSynced } = await createIcpIndexStatusCanister();

			await expect(numBlocksSynced({ certified: false })).resolves.toBe(123n);
			expect(service.status).toHaveBeenCalledOnce();
			expect(certifiedService.status).not.toHaveBeenCalled();
		});

		it('should ask the certified service when certified', async () => {
			certifiedService.status.mockResolvedValue({ num_blocks_synced: 123n });

			const { numBlocksSynced } = await createIcpIndexStatusCanister();

			await expect(numBlocksSynced({ certified: true })).resolves.toBe(123n);
			expect(certifiedService.status).toHaveBeenCalledOnce();
			expect(service.status).not.toHaveBeenCalled();
		});
	});
});
