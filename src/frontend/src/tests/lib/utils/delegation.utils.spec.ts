import { extractIIDelegationChain } from '$lib/utils/delegation.utils';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { Delegation, DelegationChain, DelegationIdentity } from '@icp-sdk/core/identity';

describe('delegation.utils', () => {
	describe('extractIIDelegationChain', () => {
		it('should return empty array for non-DelegationIdentity', () => {
			const result = extractIIDelegationChain(mockIdentity);

			expect(result).toEqual([]);
		});

		it('should extract delegation chain from DelegationIdentity', () => {
			const mockExpiration = BigInt(Date.now()) * 1_000_000n + 600_000_000_000n;
			const mockSignature = new Uint8Array([7, 8, 9]);
			const mockSessionPubkey = new Uint8Array([1, 2, 3]);

			const delegation = new Delegation(mockSessionPubkey, mockExpiration);
			const mockPublicKey = new Uint8Array([4, 5, 6]) as unknown as ArrayBuffer;

			const chain = DelegationChain.fromDelegations(
				[{ delegation, signature: mockSignature }],
				mockPublicKey
			);

			const mockInnerKey = {
				sign: vi.fn()
			};
			const delegationIdentity = DelegationIdentity.fromDelegation(mockInnerKey, chain);

			const result = extractIIDelegationChain(delegationIdentity);

			expect(result).toHaveLength(1);

			const [extracted] = result;

			expect(extracted).toBeDefined();
			expect(new Uint8Array(extracted?.public_key ?? [])).toEqual(new Uint8Array(mockPublicKey));
			expect(extracted?.delegations).toHaveLength(1);
			expect(new Uint8Array(extracted?.delegations[0].signature ?? [])).toEqual(mockSignature);
			expect(new Uint8Array(extracted?.delegations[0].delegation.pubkey ?? [])).toEqual(
				mockSessionPubkey
			);
			expect(extracted?.delegations[0].delegation.expiration).toBe(mockExpiration);
			expect(extracted?.delegations[0].delegation.targets).toEqual([]);
		});

		it('should extract delegation chain with targets', () => {
			const mockExpiration = BigInt(Date.now()) * 1_000_000n + 600_000_000_000n;
			const mockSignature = new Uint8Array([7, 8, 9]);
			const mockSessionPubkey = new Uint8Array([1, 2, 3]);

			const delegation = new Delegation(mockSessionPubkey, mockExpiration, [mockPrincipal]);
			const mockPublicKey = new Uint8Array([4, 5, 6]) as unknown as ArrayBuffer;

			const chain = DelegationChain.fromDelegations(
				[{ delegation, signature: mockSignature }],
				mockPublicKey
			);

			const mockInnerKey = {
				sign: vi.fn()
			};
			const delegationIdentity = DelegationIdentity.fromDelegation(mockInnerKey, chain);

			const result = extractIIDelegationChain(delegationIdentity);

			expect(result).toHaveLength(1);

			const [extracted] = result;

			expect(extracted?.delegations[0].delegation.targets).toEqual(toNullable([mockPrincipal]));
		});
	});
});
