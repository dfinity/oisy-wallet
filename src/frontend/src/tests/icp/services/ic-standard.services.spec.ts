import {
	balance as dip721Balance,
	getTokensByOwner as dip721GetTokensByOwner
} from '$icp/api/dip721.api';
import {
	balance as extBalance,
	getTokensByOwner as extGetTokensByOwner,
	metadata as extMetadata
} from '$icp/api/ext-v2-token.api';
import {
	collectionMetadata as icPunksCollectionMetadata,
	getTokensByOwner as icPunksGetTokensByOwner,
	metadata as icPunksMetadata
} from '$icp/api/icpunks.api';
import { detectNftCanisterStandard } from '$icp/services/ic-standard.services';
import { extIndexToIdentifier } from '$icp/utils/ext.utils';
import { ZERO } from '$lib/constants/app.constants';
import * as probingServices from '$lib/services/probing.services';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import {
	mockIcPunksCollectionMetadata,
	mockIcPunksMetadata
} from '$tests/mocks/icpunks-token.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';

vi.mock('$icp/api/ext-v2-token.api', () => ({
	balance: vi.fn(),
	getTokensByOwner: vi.fn(),
	metadata: vi.fn()
}));

vi.mock('$icp/api/dip721.api', () => ({
	balance: vi.fn(),
	getTokensByOwner: vi.fn()
}));

vi.mock('$icp/api/icpunks.api', () => ({
	getTokensByOwner: vi.fn(),
	metadata: vi.fn(),
	collectionMetadata: vi.fn()
}));

describe('ic-standard.services', () => {
	describe('detectNftCanisterStandard', () => {
		const params = {
			identity: mockIdentity,
			canisterId: mockLedgerCanisterId
		};

		const tokenIdentifier = extIndexToIdentifier({
			collectionId: Principal.fromText(params.canisterId),
			index: 0
		});

		const expected = {
			certified: false,
			identity: mockIdentity,
			canisterId: mockLedgerCanisterId
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(extBalance).mockResolvedValue(ZERO);
			vi.mocked(extGetTokensByOwner).mockResolvedValue([]);
			vi.mocked(extMetadata).mockResolvedValue(undefined);

			vi.mocked(dip721Balance).mockResolvedValue(ZERO);
			vi.mocked(dip721GetTokensByOwner).mockResolvedValue([]);

			vi.mocked(icPunksGetTokensByOwner).mockResolvedValue([]);
			vi.mocked(icPunksMetadata).mockResolvedValue(mockIcPunksMetadata);
			vi.mocked(icPunksCollectionMetadata).mockResolvedValue(mockIcPunksCollectionMetadata);
		});

		it('should detect an EXT canister', async () => {
			vi.mocked(dip721Balance).mockRejectedValue(new Error('Not a DIP721 canister'));

			await expect(detectNftCanisterStandard(params)).resolves.toBe('ext');

			expect(extBalance).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});
			expect(extGetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});
			expect(extMetadata).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});

			expect(dip721Balance).not.toHaveBeenCalled();
			expect(dip721GetTokensByOwner).not.toHaveBeenCalled();

			expect(icPunksGetTokensByOwner).not.toHaveBeenCalled();
			expect(icPunksMetadata).not.toHaveBeenCalled();
			expect(icPunksCollectionMetadata).not.toHaveBeenCalled();
		});

		it('should detect a DIP721 canister', async () => {
			vi.mocked(extBalance).mockRejectedValue(new Error('Not an EXT canister'));

			await expect(detectNftCanisterStandard(params)).resolves.toBe('dip721');

			expect(extBalance).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});
			expect(extGetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});
			expect(extMetadata).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});

			expect(dip721Balance).toHaveBeenCalledExactlyOnceWith(expected);
			expect(dip721GetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});

			expect(icPunksGetTokensByOwner).not.toHaveBeenCalled();
			expect(icPunksMetadata).not.toHaveBeenCalled();
			expect(icPunksCollectionMetadata).not.toHaveBeenCalled();
		});

		it('should detect an ICPunks canister', async () => {
			vi.mocked(extBalance).mockRejectedValue(new Error('Not an EXT canister'));
			vi.mocked(dip721Balance).mockRejectedValue(new Error('Not a DIP721 canister'));

			await expect(detectNftCanisterStandard(params)).resolves.toBe('icpunks');

			expect(extBalance).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});
			expect(extGetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});
			expect(extMetadata).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});

			expect(dip721Balance).toHaveBeenCalledExactlyOnceWith(expected);
			expect(dip721GetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});

			expect(icPunksGetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});
			expect(icPunksMetadata).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier: 1n
			});
			expect(icPunksCollectionMetadata).toHaveBeenCalledExactlyOnceWith(expected);
		});

		it('should return undefined for unrecognized canisters', async () => {
			vi.mocked(extBalance).mockRejectedValue(new Error('Not an EXT canister'));
			vi.mocked(dip721Balance).mockRejectedValue(new Error('Not a DIP721 canister'));
			vi.mocked(icPunksGetTokensByOwner).mockRejectedValue(new Error('Not an ICPunks canister'));

			await expect(detectNftCanisterStandard(params)).resolves.toBeUndefined();

			expect(extBalance).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});
			expect(extGetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});
			expect(extMetadata).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});

			expect(dip721Balance).toHaveBeenCalledExactlyOnceWith(expected);
			expect(dip721GetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});

			expect(icPunksGetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});
			expect(icPunksMetadata).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier: 1n
			});
			expect(icPunksCollectionMetadata).toHaveBeenCalledExactlyOnceWith(expected);
		});

		it('should throw any other error from the service', async () => {
			vi.spyOn(probingServices, 'resolveByProbing').mockRejectedValueOnce(
				new Error('Unexpected error')
			);

			await expect(detectNftCanisterStandard(params)).rejects.toThrowError('Unexpected error');

			expect(extBalance).not.toHaveBeenCalled();
			expect(extGetTokensByOwner).not.toHaveBeenCalled();
			expect(extMetadata).not.toHaveBeenCalled();

			expect(dip721Balance).not.toHaveBeenCalled();
			expect(dip721GetTokensByOwner).not.toHaveBeenCalled();

			expect(icPunksGetTokensByOwner).not.toHaveBeenCalled();
			expect(icPunksMetadata).not.toHaveBeenCalled();
			expect(icPunksCollectionMetadata).not.toHaveBeenCalled();
		});

		it('should prioritize EXT over any other standard', async () => {
			await expect(detectNftCanisterStandard(params)).resolves.toBe('ext');

			expect(extBalance).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});
			expect(extGetTokensByOwner).toHaveBeenCalledExactlyOnceWith({
				...expected,
				owner: mockIdentity.getPrincipal()
			});
			expect(extMetadata).toHaveBeenCalledExactlyOnceWith({
				...expected,
				tokenIdentifier
			});

			expect(dip721Balance).not.toHaveBeenCalled();
			expect(dip721GetTokensByOwner).not.toHaveBeenCalled();

			expect(icPunksGetTokensByOwner).not.toHaveBeenCalled();
			expect(icPunksMetadata).not.toHaveBeenCalled();
			expect(icPunksCollectionMetadata).not.toHaveBeenCalled();
		});
	});
});
