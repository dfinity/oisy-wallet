import type { SolAddress } from '$sol/types/address';
import type { SolRpcInstruction } from '$sol/types/sol-instructions';
import type { MappedSolTransaction, SolTransferLeg } from '$sol/types/sol-transaction';
import {
	deriveSolTransferParties,
	isSolTransferInstruction,
	isSolTransferSourcesRedundant,
	solTransferPartyAddress,
	toSolTransferLeg
} from '$sol/utils/sol-transfer-parties.utils';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockAtaAddress3,
	mockSolAddress,
	mockSolAddress2,
	mockSolAddress3,
	mockSolAddress4
} from '$tests/mocks/sol.mock';

describe('sol-transfer-parties.utils', () => {
	const leg = ({
		source,
		destination
	}: {
		source: SolAddress;
		destination: SolAddress;
	}): SolTransferLeg => ({ source, destination, amount: 1_000n });

	const parsedInstruction = (type: string): SolRpcInstruction =>
		({ parsed: { type, info: {} } }) as unknown as SolRpcInstruction;

	describe('toSolTransferLeg', () => {
		it('should turn a decoded transfer into a leg', () => {
			const mapped: MappedSolTransaction = {
				amount: 42n,
				source: mockSolAddress,
				destination: mockSolAddress2
			};

			expect(toSolTransferLeg(mapped)).toEqual({
				amount: 42n,
				source: mockSolAddress,
				destination: mockSolAddress2
			});
		});

		it('should yield no leg for an approval, whose destination is a delegate', () => {
			const mapped: MappedSolTransaction = {
				amount: 42n,
				source: mockSolAddress,
				destination: mockSolAddress2,
				isApproval: true
			};

			expect(toSolTransferLeg(mapped)).toBeUndefined();
		});

		it('should yield no leg for an account creation, which names no counterparty', () => {
			// `createAccount` reports its payer and no parties at all.
			const mapped: MappedSolTransaction = { amount: 2_039_280n, payer: mockSolAddress };

			expect(toSolTransferLeg(mapped)).toBeUndefined();
		});

		it('should yield no leg for an instruction that moves nothing', () => {
			expect(toSolTransferLeg({ amount: undefined })).toBeUndefined();
		});
	});

	describe('isSolTransferInstruction', () => {
		it.each(['transfer', 'transferChecked'])('should accept %s', (type) => {
			expect(isSolTransferInstruction(parsedInstruction(type))).toBeTruthy();
		});

		it.each(['create', 'createIdempotent', 'createAccount', 'mintTo', 'burn', 'closeAccount'])(
			'should reject %s, which is not a transfer',
			(type) => {
				expect(isSolTransferInstruction(parsedInstruction(type))).toBeFalsy();
			}
		);

		it('should reject an instruction the RPC could not parse', () => {
			expect(
				isSolTransferInstruction({ accounts: [], data: 'aGk' } as unknown as SolRpcInstruction)
			).toBeFalsy();
		});
	});

	describe('deriveSolTransferParties', () => {
		it('should give a plain send exactly one entry in each list', () => {
			const parties = deriveSolTransferParties({
				legs: [leg({ source: mockSolAddress, destination: mockSolAddress2 })],
				ownedAddresses: [mockSolAddress]
			});

			expect(parties).toEqual({
				sources: [{ address: mockSolAddress, own: true }],
				destinations: [{ address: mockSolAddress2, own: false }]
			});
		});

		// The worked example of the spec: four token transfers inside a routed swap.
		it('should name every party a routed swap puts us on either side of', () => {
			const ourWsolAccount = mockAtaAddress;
			const ourUsdcAccount = mockAtaAddress2;
			const poolVaultA = mockSolAddress2;
			const poolVaultB = mockSolAddress3;
			const protocolFeeAccount = mockSolAddress4;

			const parties = deriveSolTransferParties({
				legs: [
					leg({ source: ourWsolAccount, destination: poolVaultA }),
					leg({ source: poolVaultB, destination: ourUsdcAccount }),
					leg({ source: poolVaultA, destination: protocolFeeAccount }),
					leg({ source: poolVaultB, destination: poolVaultA })
				],
				ownedAddresses: [mockSolAddress, ourWsolAccount, ourUsdcAccount],
				addressToOwner: {
					[ourWsolAccount]: mockSolAddress,
					[ourUsdcAccount]: mockSolAddress
				}
			});

			expect(parties).toEqual({
				sources: [{ address: ourWsolAccount, owner: mockSolAddress, own: true }],
				destinations: [
					{ address: poolVaultA, own: false },
					{ address: ourUsdcAccount, owner: mockSolAddress, own: true }
				]
			});
		});

		it('should never put a counterparty among the sources', () => {
			const parties = deriveSolTransferParties({
				legs: [leg({ source: mockSolAddress2, destination: mockSolAddress3 })],
				ownedAddresses: [mockSolAddress]
			});

			expect(parties).toEqual({ sources: [], destinations: [] });
		});

		it('should not put us among the sources of a leg we only receive from', () => {
			const parties = deriveSolTransferParties({
				legs: [leg({ source: mockSolAddress2, destination: mockSolAddress })],
				ownedAddresses: [mockSolAddress]
			});

			expect(parties).toEqual({
				sources: [],
				destinations: [{ address: mockSolAddress, own: true }]
			});
		});

		it('should keep an address once, on its first appearance', () => {
			const parties = deriveSolTransferParties({
				legs: [
					leg({ source: mockSolAddress, destination: mockSolAddress2 }),
					leg({ source: mockSolAddress, destination: mockSolAddress3 }),
					leg({ source: mockSolAddress, destination: mockSolAddress2 })
				],
				ownedAddresses: [mockSolAddress]
			});

			expect(parties).toEqual({
				sources: [{ address: mockSolAddress, own: true }],
				destinations: [
					{ address: mockSolAddress2, own: false },
					{ address: mockSolAddress3, own: false }
				]
			});
		});

		it('should derive nothing from a transaction with no legs at all', () => {
			expect(deriveSolTransferParties({ legs: [], ownedAddresses: [mockSolAddress] })).toEqual({
				sources: [],
				destinations: []
			});
		});

		it('should match on a token account the user owns, not only on their wallet', () => {
			const parties = deriveSolTransferParties({
				legs: [leg({ source: mockAtaAddress, destination: mockAtaAddress3 })],
				ownedAddresses: [mockSolAddress, mockAtaAddress],
				addressToOwner: { [mockAtaAddress]: mockSolAddress, [mockAtaAddress3]: mockSolAddress2 }
			});

			expect(parties).toEqual({
				sources: [{ address: mockAtaAddress, owner: mockSolAddress, own: true }],
				destinations: [{ address: mockAtaAddress3, owner: mockSolAddress2, own: false }]
			});
		});
	});

	describe('solTransferPartyAddress', () => {
		it('should show the owning wallet where it is known', () => {
			expect(
				solTransferPartyAddress({ address: mockAtaAddress, owner: mockSolAddress, own: true })
			).toBe(mockSolAddress);
		});

		it('should show the account itself where the owner is not known', () => {
			expect(solTransferPartyAddress({ address: mockAtaAddress, own: false })).toBe(mockAtaAddress);
		});
	});

	describe('isSolTransferSourcesRedundant', () => {
		it('should call a list that resolves to the wallet the review already names redundant', () => {
			expect(
				isSolTransferSourcesRedundant({
					sources: [{ address: mockAtaAddress, owner: mockSolAddress, own: true }],
					userAddress: mockSolAddress
				})
			).toBeTruthy();
		});

		it('should keep a source that cannot be resolved to that wallet', () => {
			expect(
				isSolTransferSourcesRedundant({
					sources: [
						{ address: mockSolAddress, own: true },
						{ address: mockAtaAddress, own: true }
					],
					userAddress: mockSolAddress
				})
			).toBeFalsy();
		});
	});
});
