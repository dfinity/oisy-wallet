import { getCompactSignature, getSignParamsEIP712 } from '$eth/utils/eip712.utils';
import { SwapSide, type DeltaAuctionOrder, type SignableDeltaOrderData } from '@velora-dex/sdk';
import { SwapSideToOrderKind } from '@velora-dex/sdk/dist/methods/delta/helpers/types';
import { Signature } from 'ethers/crypto';
import { TypedDataEncoder } from 'ethers/hash';

vi.mock('ethers/hash', () => ({
	TypedDataEncoder: {
		hash: vi.fn()
	}
}));

vi.mock('ethers/crypto', () => ({
	Signature: {
		from: vi.fn()
	}
}));

const orderTypes = [
	{ name: 'owner', type: 'address' },
	{ name: 'beneficiary', type: 'address' },
	{ name: 'srcToken', type: 'address' },
	{ name: 'destToken', type: 'address' },
	{ name: 'srcAmount', type: 'uint256' },
	{ name: 'destAmount', type: 'uint256' },
	{ name: 'expectedAmount', type: 'uint256' },
	{ name: 'deadline', type: 'uint256' },
	{ name: 'nonce', type: 'uint256' },
	{ name: 'permit', type: 'bytes' },
	{ name: 'partnerAndFee', type: 'uint256' },
	{ name: 'bridge', type: 'Bridge' }
];

const mockTypedDataEncoder = vi.mocked(TypedDataEncoder);
const mockSignature = vi.mocked(Signature);

describe('EIP - 712 utils methods', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getSignParamsEIP712', () => {
		it('should call TypedDataEncoder.hash with correct parameters and return result', () => {
			const expectedHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
			const inputParams: SignableDeltaOrderData = {
				domain: {
					name: 'Velora DEX',
					version: '1',
					chainId: 1,
					verifyingContract: '0x1234567890123456789012345678901234567890'
				},
				types: {
					Order: orderTypes,
					Bridge: [
						{ name: 'bridgeAddress', type: 'address' },
						{ name: 'chainId', type: 'uint256' }
					]
				},
				data: {
					owner: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
					beneficiary: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
					srcToken: '0x1111111111111111111111111111111111111111',
					destToken: '0x2222222222222222222222222222222222222222',
					srcAmount: '1000000000000000000',
					destAmount: '950000000000000000',
					expectedAmount: '1000000000000000000',
					kind: SwapSideToOrderKind[SwapSide.SELL],
					metadata: '0x',
					deadline: 1705449600,
					nonce: '123456789',
					permit: '0x',
					partnerAndFee: '0',
					bridge: {
						destinationChainId: 1,
						outputToken: '0x5555555555555555555555555555555555555555',
						protocolSelector: 'bridge_protocol',
						scalingFactor: 1000000,
						protocolData: '0xprotocol_data'
					}
				}
			};

			mockTypedDataEncoder.hash.mockReturnValue(expectedHash);

			const result = getSignParamsEIP712(inputParams);

			expect(mockTypedDataEncoder.hash).toHaveBeenNthCalledWith(
				1,
				inputParams.domain,
				inputParams.types,
				inputParams.data
			);
			expect(result).toBe(expectedHash);
		});

		it('should handle different domain configurations', () => {
			const expectedHash = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef';
			const inputParams: SignableDeltaOrderData = {
				domain: {
					name: 'Test DEX',
					version: '2',
					chainId: 42,
					verifyingContract: '0x9876543210987654321098765432109876543210'
				},
				types: {
					Order: orderTypes,
					Bridge: [
						{ name: 'bridgeAddress', type: 'address' },
						{ name: 'chainId', type: 'uint256' }
					]
				},
				data: {
					owner: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
					beneficiary: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
					srcToken: '0x1111111111111111111111111111111111111111',
					destToken: '0x2222222222222222222222222222222222222222',
					srcAmount: '1000000000000000000',
					destAmount: '950000000000000000',
					expectedAmount: '1000000000000000000',
					kind: SwapSideToOrderKind[SwapSide.SELL],
					metadata: '0x',
					deadline: 1705449600,
					nonce: '123456789',
					permit: '0x',
					partnerAndFee: '0',
					bridge: {
						destinationChainId: 1,
						outputToken: '0x5555555555555555555555555555555555555555',
						protocolSelector: 'bridge_protocol',
						scalingFactor: 1000000,
						protocolData: '0xprotocol_data'
					}
				}
			};

			mockTypedDataEncoder.hash.mockReturnValue(expectedHash);

			const result = getSignParamsEIP712(inputParams);

			expect(mockTypedDataEncoder.hash).toHaveBeenNthCalledWith(
				1,
				inputParams.domain,
				inputParams.types,
				inputParams.data
			);
			expect(result).toBe(expectedHash);
		});

		it('should handle empty data object', () => {
			const expectedHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
			const inputParams: SignableDeltaOrderData = {
				domain: {
					name: 'Empty Test',
					version: '1',
					chainId: 1,
					verifyingContract: '0x0000000000000000000000000000000000000000'
				},
				types: {
					Order: [],
					Bridge: []
				},
				data: {} as DeltaAuctionOrder
			};

			mockTypedDataEncoder.hash.mockReturnValue(expectedHash);

			const result = getSignParamsEIP712(inputParams);

			expect(mockTypedDataEncoder.hash).toHaveBeenNthCalledWith(
				1,
				inputParams.domain,
				inputParams.types,
				inputParams.data
			);
			expect(result).toBe(expectedHash);
		});
	});

	describe('getCompactSignature', () => {
		it('should call Signature.from with input and return compactSerialized', () => {
			const inputSignature =
				'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c';
			const expectedCompactSerialized =
				'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
			const mockSignatureObject = {
				compactSerialized: expectedCompactSerialized
			} as Signature;

			mockSignature.from.mockReturnValue(mockSignatureObject);

			const result = getCompactSignature(inputSignature);

			expect(mockSignature.from).toHaveBeenNthCalledWith(1, inputSignature);
			expect(result).toBe(expectedCompactSerialized);
		});

		it('should handle different signature formats', () => {
			const inputSignature = 'signature-in-different-format';
			const expectedCompactSerialized = '0xcompact-result';
			const mockSignatureObject = {
				compactSerialized: expectedCompactSerialized
			} as Signature;

			mockSignature.from.mockReturnValue(mockSignatureObject);

			const result = getCompactSignature(inputSignature);

			expect(mockSignature.from).toHaveBeenNthCalledWith(1, inputSignature);
			expect(result).toBe(expectedCompactSerialized);
		});

		it('should handle empty signature string', () => {
			const inputSignature = '';
			const expectedCompactSerialized = '0x';
			const mockSignatureObject = {
				compactSerialized: expectedCompactSerialized
			} as Signature;

			mockSignature.from.mockReturnValue(mockSignatureObject);

			const result = getCompactSignature(inputSignature);

			expect(mockSignature.from).toHaveBeenNthCalledWith(1, inputSignature);
			expect(result).toBe(expectedCompactSerialized);
		});

		it('should handle signature with various compactSerialized values', () => {
			const testCases = [
				{
					input: 'signature1',
					expectedOutput: '0x1111111111111111111111111111111111111111111111111111111111111111'
				},
				{
					input: 'signature2',
					expectedOutput: '0x2222222222222222222222222222222222222222222222222222222222222222'
				}
			];

			testCases.forEach(({ input, expectedOutput }) => {
				const mockSignatureObject = {
					compactSerialized: expectedOutput
				} as Signature;

				mockSignature.from.mockReturnValue(mockSignatureObject);

				const result = getCompactSignature(input);

				expect(mockSignature.from).toHaveBeenCalledWith(input);
				expect(result).toBe(expectedOutput);
			});
		});
	});

	describe('Integration scenarios', () => {
		it('should work together in a typical signing flow', () => {
			const orderData: SignableDeltaOrderData = {
				domain: {
					name: 'Velora DEX',
					version: '1',
					chainId: 1,
					verifyingContract: '0x1234567890123456789012345678901234567890'
				},
				types: {
					Order: orderTypes,
					Bridge: [
						{ name: 'bridgeAddress', type: 'address' },
						{ name: 'chainId', type: 'uint256' }
					]
				},
				data: {
					owner: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
					beneficiary: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
					srcToken: '0x1111111111111111111111111111111111111111',
					destToken: '0x2222222222222222222222222222222222222222',
					srcAmount: '1000000000000000000',
					destAmount: '950000000000000000',
					expectedAmount: '1000000000000000000',
					kind: SwapSideToOrderKind[SwapSide.SELL],
					metadata: '0x',
					deadline: 1705449600,
					nonce: '123456789',
					permit: '0x',
					partnerAndFee: '0',
					bridge: {
						destinationChainId: 1,
						outputToken: '0x5555555555555555555555555555555555555555',
						protocolSelector: 'bridge_protocol',
						scalingFactor: 1000000,
						protocolData: '0xprotocol_data'
					}
				}
			};

			const signatureString =
				'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c';
			const expectedHash = '0xhash-result';
			const expectedCompactSignature = '0xcompact-result';

			mockTypedDataEncoder.hash.mockReturnValue(expectedHash);
			mockSignature.from.mockReturnValue({
				compactSerialized: expectedCompactSignature
			} as Signature);

			const hash = getSignParamsEIP712(orderData);
			const compactSig = getCompactSignature(signatureString);

			expect(mockTypedDataEncoder.hash).toHaveBeenNthCalledWith(
				1,
				orderData.domain,
				orderData.types,
				orderData.data
			);
			expect(hash).toBe(expectedHash);

			expect(mockSignature.from).toHaveBeenNthCalledWith(1, signatureString);
			expect(compactSig).toBe(expectedCompactSignature);
		});
	});
});
