import type { _SERVICE as IcPunksService } from '$declarations/icpunks/icpunks.did';
import { IcPunksCanister } from '$icp/canisters/icpunks.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('icpunks.canister', () => {
	const certified = false;

	const createIcPunksCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<IcPunksService>, 'serviceOverride'>): Promise<IcPunksCanister> =>
		IcPunksCanister.create({
			canisterId: Principal.fromText(mockIcPunksCanisterId),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<IcPunksService>>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTokensByOwner', () => {
		const mockParams = { principal: mockPrincipal, certified };

		const mockIdentifiers = [12345n, 54321n];

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the user_tokens method', async () => {
			service.user_tokens.mockResolvedValue(mockIdentifiers);

			const { getTokensByOwner } = await createIcPunksCanister({ serviceOverride: service });

			const res = await getTokensByOwner(mockParams);

			expect(res).toEqual(mockIdentifiers);
			expect(service.user_tokens).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should throw an error if user_tokens throws', async () => {
			const mockError = new Error('Test response error');
			service.user_tokens.mockRejectedValue(mockError);

			const { getTokensByOwner } = await createIcPunksCanister({ serviceOverride: service });

			const res = getTokensByOwner(mockParams);

			await expect(res).rejects.toThrowError(mockError);

			expect(service.user_tokens).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});
	});
});
