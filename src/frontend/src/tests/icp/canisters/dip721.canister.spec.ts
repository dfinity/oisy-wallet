import type { _SERVICE as Dip721Service } from '$declarations/dip721/dip721.did';
import { Dip721Canister } from '$icp/canisters/dip721.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockDip721TokenCanisterId } from '$tests/mocks/dip721-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('dip721.canister', () => {
	const certified = false;

	const createDip721Canister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<Dip721Service>, 'serviceOverride'>): Promise<Dip721Canister> =>
		Dip721Canister.create({
			canisterId: Principal.fromText(mockDip721TokenCanisterId),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<Dip721Service>>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('balanceOf', () => {
		const mockParams = { principal: mockPrincipal, certified };

		const mockBalance = 12345n;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should correctly call the balanceOf method', async () => {
			service.balanceOf.mockResolvedValue({ Ok: mockBalance });

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			const res = await balanceOf(mockParams);

			expect(res).toEqual(mockBalance);
			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should handle unauthorized operator error', async () => {
			service.balanceOf.mockResolvedValue({ Err: { UnauthorizedOperator: null } });

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			await expect(balanceOf(mockParams)).rejects.toThrowError(
				new CanisterInternalError('Unauthorized operator')
			);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should handle self transfer error', async () => {
			service.balanceOf.mockResolvedValue({ Err: { SelfTransfer: null } });

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			await expect(balanceOf(mockParams)).rejects.toThrowError(
				new CanisterInternalError('Cannot transfer NFT to self')
			);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should handle token not found error', async () => {
			service.balanceOf.mockResolvedValue({ Err: { TokenNotFound: null } });

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			await expect(balanceOf(mockParams)).rejects.toThrowError(
				new CanisterInternalError('NFT token not found')
			);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should handle unauthorized owner error', async () => {
			service.balanceOf.mockResolvedValue({ Err: { UnauthorizedOwner: null } });

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			await expect(balanceOf(mockParams)).rejects.toThrowError(
				new CanisterInternalError('Unauthorized owner for the NFT')
			);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should handle self approve error', async () => {
			service.balanceOf.mockResolvedValue({ Err: { SelfApprove: null } });

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			await expect(balanceOf(mockParams)).rejects.toThrowError(
				new CanisterInternalError('Cannot approve self for the NFT')
			);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should handle operator not found error', async () => {
			service.balanceOf.mockResolvedValue({ Err: { OperatorNotFound: null } });

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			await expect(balanceOf(mockParams)).rejects.toThrowError(
				new CanisterInternalError('Operator not found for the NFT')
			);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should handle existed NFT error', async () => {
			service.balanceOf.mockResolvedValue({ Err: { ExistedNFT: null } });

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			await expect(balanceOf(mockParams)).rejects.toThrowError(
				new CanisterInternalError('NFT already exists')
			);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should handle owner not found error', async () => {
			service.balanceOf.mockResolvedValue({ Err: { OwnerNotFound: null } });

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			await expect(balanceOf(mockParams)).rejects.toThrowError(
				new CanisterInternalError('Owner not found for the NFT')
			);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should handle a generic canister error', async () => {
			// @ts-expect-error we test this on purpose
			service.balanceOf.mockResolvedValue({ Err: { CanisterError: null } });

			const { balanceOf } = await createDip721Canister({
				serviceOverride: service
			});

			await expect(balanceOf(mockParams)).rejects.toThrowError(
				new CanisterInternalError('Unknown Dip721CanisterError')
			);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});

		it('should throw an error if balanceOf throws', async () => {
			const mockError = new Error('Test response error');
			service.balanceOf.mockRejectedValue(mockError);

			const { balanceOf } = await createDip721Canister({ serviceOverride: service });

			const res = balanceOf(mockParams);

			await expect(res).rejects.toThrowError(mockError);

			expect(service.balanceOf).toHaveBeenCalledExactlyOnceWith(mockPrincipal);
		});
	});
});
