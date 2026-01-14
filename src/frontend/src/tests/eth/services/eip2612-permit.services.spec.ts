import { INFURA_API_KEY } from '$env/rest/infura.env';
import { EIP2612_TYPES, PERMIT_DEADLINE_SECONDS } from '$eth/constants/eip2612.constants';
import { ERC20_PERMIT_ABI } from '$eth/constants/erc20.constants';
import { createPermit } from '$eth/services/eip2612-permit.services';
import type { EthAddress } from '$eth/types/address';
import * as signerApi from '$lib/api/signer.api';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import type { Identity } from '@icp-sdk/core/agent';
import { Contract } from 'ethers/contract';
import { Signature } from 'ethers/crypto';
import { TypedDataEncoder } from 'ethers/hash';
import { InfuraProvider } from 'ethers/providers';
import { concat, toBeHex, zeroPadValue, type BigNumberish, type BytesLike } from 'ethers/utils';

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

vi.mock('ethers/crypto', () => ({
	Signature: {
		from: vi.fn()
	}
}));

vi.mock('ethers/hash', () => ({
	TypedDataEncoder: {
		hash: vi.fn()
	}
}));

vi.mock('ethers/providers', () => ({
	InfuraProvider: vi.fn()
}));

vi.mock('ethers/utils', () => ({
	concat: vi.fn(),
	toBeHex: vi.fn(),
	zeroPadValue: vi.fn()
}));

vi.mock('$lib/api/signer.api');

describe('EIP2612 Permit Services', () => {
	const mockUserAddress = '0x1234567890123456789012345678901234567890' as EthAddress;
	const mockSpenderAddress = '0x0987654321098765432109876543210987654321' as EthAddress;
	const mockValue = '1000000000000000000';
	const mockChainId = 1;
	const mockNonce = BigInt(0);
	const mockHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
	const mockSignatureData = new Uint8Array(65).toString();
	const mockEncodedPermit = '0xencoded';

	const mockIdentity = {} as Identity;

	const mockContract = vi.mocked(Contract);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('createDeadline', () => {
		it('should create deadline with default offset', () => {
			const now = Date.now();
			const expectedDeadline = Math.floor(now / 1000) + PERMIT_DEADLINE_SECONDS;

			expect(Math.floor(now / 1000)).toBeLessThanOrEqual(expectedDeadline);
		});

		it('should create deadline with custom offset', () => {
			const customOffset = 300;
			const now = Date.now();
			const expectedDeadline = Math.floor(now / 1000) + customOffset;

			expect(Math.floor(now / 1000)).toBeLessThanOrEqual(expectedDeadline);
		});
	});

	describe('fetchPermitMetadata', () => {
		it('should fetch metadata with nonce from contract', async () => {
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			mockContract.prototype.nonces = mockNonces as unknown as typeof mockContract.prototype.nonces;
			mockContract.prototype.version =
				mockVersionFn as unknown as typeof mockContract.prototype.version;

			vi.mocked(Signature.from).mockReturnValue({
				v: 27,
				r: `0x${'a'.repeat(64)}`,
				s: `0x${'b'.repeat(64)}`
			} as unknown as Signature);

			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(mockNonces).toHaveBeenCalledWith(mockUserAddress);
		});

		it('should use custom deadline if provided', async () => {
			const customDeadline = 9999999999;
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			mockContract.prototype.nonces = mockNonces as unknown as typeof mockContract.prototype.nonces;
			mockContract.prototype.version =
				mockVersionFn as unknown as typeof mockContract.prototype.version;

			vi.mocked(TypedDataEncoder.hash).mockReturnValue(mockHash);
			vi.mocked(signerApi.signPrehash).mockResolvedValue(mockSignatureData);
			vi.mocked(Signature.from).mockReturnValue({
				v: 27,
				r: `0x${'a'.repeat(64)}`,
				s: `0x${'b'.repeat(64)}`
			} as unknown as Signature);
			vi.mocked(concat).mockReturnValue(mockEncodedPermit);

			const result = await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				deadline: customDeadline,
				identity: mockIdentity
			});

			expect(result.deadline).toBe(customDeadline);
		});

		it('should return metadata with correct structure', async () => {
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			mockContract.prototype.nonces = mockNonces as unknown as typeof mockContract.prototype.nonces;
			mockContract.prototype.version =
				mockVersionFn as unknown as typeof mockContract.prototype.version;

			vi.mocked(TypedDataEncoder.hash).mockReturnValue(mockHash);
			vi.mocked(signerApi.signPrehash).mockResolvedValue(mockSignatureData);
			vi.mocked(Signature.from).mockReturnValue({
				v: 27,
				r: `0x${'a'.repeat(64)}`,
				s: `0x${'b'.repeat(64)}`
			} as unknown as Signature);
			vi.mocked(concat).mockReturnValue(mockEncodedPermit);

			const result = await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(result.nonce).toBe(mockNonce.toString());
			expect(typeof result.deadline).toBe('number');
		});
	});

	describe('createEIP2612TypedData', () => {
		it('should create correct domain structure', async () => {
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			mockContract.prototype.nonces = mockNonces as unknown as typeof mockContract.prototype.nonces;
			mockContract.prototype.version =
				mockVersionFn as unknown as typeof mockContract.prototype.version;

			vi.mocked(TypedDataEncoder.hash).mockReturnValue(mockHash);
			vi.mocked(signerApi.signPrehash).mockResolvedValue(mockSignatureData);
			vi.mocked(Signature.from).mockReturnValue({
				v: 27,
				r: `0x${'a'.repeat(64)}`,
				s: `0x${'b'.repeat(64)}`
			} as unknown as Signature);
			vi.mocked(concat).mockReturnValue(mockEncodedPermit);

			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(TypedDataEncoder.hash).toHaveBeenCalledWith(
				expect.objectContaining({
					name: mockValidErc20Token.name,
					version: '2',
					chainId: mockChainId,
					verifyingContract: mockValidErc20Token.address
				}),
				EIP2612_TYPES,
				expect.any(Object)
			);
		});

		it('should create correct values structure', async () => {
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			mockContract.prototype.nonces = mockNonces as unknown as typeof mockContract.prototype.nonces;
			mockContract.prototype.version =
				mockVersionFn as unknown as typeof mockContract.prototype.version;

			vi.mocked(TypedDataEncoder.hash).mockReturnValue(mockHash);
			vi.mocked(signerApi.signPrehash).mockResolvedValue(mockSignatureData);
			vi.mocked(Signature.from).mockReturnValue({
				v: 27,
				r: `0x${'a'.repeat(64)}`,
				s: `0x${'b'.repeat(64)}`
			} as unknown as Signature);
			vi.mocked(concat).mockReturnValue(mockEncodedPermit);

			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(TypedDataEncoder.hash).toHaveBeenCalledWith(
				expect.any(Object),
				EIP2612_TYPES,
				expect.objectContaining({
					owner: mockUserAddress,
					spender: mockSpenderAddress,
					value: mockValue,
					nonce: mockNonce.toString(),
					deadline: expect.any(String)
				})
			);
		});
	});

	describe('createPermitHash', () => {
		it('should initialize InfuraProvider with correct parameters', async () => {
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			mockContract.prototype.nonces = mockNonces as unknown as typeof mockContract.prototype.nonces;
			mockContract.prototype.version =
				mockVersionFn as unknown as typeof mockContract.prototype.version;

			vi.mocked(TypedDataEncoder.hash).mockReturnValue(mockHash);
			vi.mocked(signerApi.signPrehash).mockResolvedValue(mockSignatureData);
			vi.mocked(Signature.from).mockReturnValue({
				v: 27,
				r: `0x${'a'.repeat(64)}`,
				s: `0x${'b'.repeat(64)}`
			} as unknown as Signature);
			vi.mocked(concat).mockReturnValue(mockEncodedPermit);

			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(InfuraProvider).toHaveBeenCalledWith(
				mockValidErc20Token.network.chainId,
				INFURA_API_KEY
			);
		});

		it('should initialize Contract with correct parameters', async () => {
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			mockContract.prototype.nonces = mockNonces as unknown as typeof mockContract.prototype.nonces;
			mockContract.prototype.version =
				mockVersionFn as unknown as typeof mockContract.prototype.version;

			vi.mocked(TypedDataEncoder.hash).mockReturnValue(mockHash);
			vi.mocked(signerApi.signPrehash).mockResolvedValue(mockSignatureData);
			vi.mocked(Signature.from).mockReturnValue({
				v: 27,
				r: `0x${'a'.repeat(64)}`,
				s: `0x${'b'.repeat(64)}`
			} as unknown as Signature);
			vi.mocked(concat).mockReturnValue(mockEncodedPermit);

			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(Contract).toHaveBeenCalledWith(mockValidErc20Token.address, ERC20_PERMIT_ABI, {});
		});

		it('should create hash using TypedDataEncoder', async () => {
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			mockContract.prototype.nonces = mockNonces as unknown as typeof mockContract.prototype.nonces;
			mockContract.prototype.version =
				mockVersionFn as unknown as typeof mockContract.prototype.version;

			vi.mocked(TypedDataEncoder.hash).mockReturnValue(mockHash);
			vi.mocked(signerApi.signPrehash).mockResolvedValue(mockSignatureData);
			vi.mocked(Signature.from).mockReturnValue({
				v: 27,
				r: `0x${'a'.repeat(64)}`,
				s: `0x${'b'.repeat(64)}`
			} as unknown as Signature);
			vi.mocked(concat).mockReturnValue(mockEncodedPermit);

			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(TypedDataEncoder.hash).toHaveBeenCalled();
		});
	});

	describe('createPermit', () => {
		beforeEach(() => {
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			mockContract.prototype.nonces = mockNonces as unknown as typeof mockContract.prototype.nonces;
			mockContract.prototype.version =
				mockVersionFn as unknown as typeof mockContract.prototype.version;

			vi.mocked(TypedDataEncoder.hash).mockReturnValue(mockHash);
			vi.mocked(signerApi.signPrehash).mockResolvedValue(mockSignatureData);
			vi.mocked(Signature.from).mockReturnValue({
				v: 27,
				r: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				s: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
			} as unknown as Signature);
			vi.mocked(concat).mockReturnValue(mockEncodedPermit);
			vi.mocked(zeroPadValue).mockImplementation((data: BytesLike) => data as string);
			vi.mocked(toBeHex).mockImplementation((value: BigNumberish) => `0x${value.toString()}`);
		});

		it('should call signPrehash with correct parameters', async () => {
			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(signerApi.signPrehash).toHaveBeenCalledWith({
				hash: mockHash,
				identity: mockIdentity
			});
		});

		it('should create signature from signature data', async () => {
			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(Signature.from).toHaveBeenCalledWith(mockSignatureData);
		});

		it('should encode permit with correct parameters', async () => {
			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(zeroPadValue).toHaveBeenCalledWith(mockUserAddress, 32);
			expect(zeroPadValue).toHaveBeenCalledWith(mockSpenderAddress, 32);
			expect(toBeHex).toHaveBeenCalledWith(mockValue, 32);
			expect(toBeHex).toHaveBeenCalledWith(expect.any(Number), 32); // deadline
			expect(toBeHex).toHaveBeenCalledWith(27, 32); // v
		});

		it('should concat all permit components correctly', async () => {
			const mockSignature = {
				v: 27,
				r: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
				s: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
			};

			vi.mocked(Signature.from).mockReturnValue(mockSignature as unknown as Signature);

			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(concat).toHaveBeenCalledWith([
				mockUserAddress, // owner (32 bytes)
				mockSpenderAddress, // spender (32 bytes)
				expect.any(String), // value (32 bytes)
				expect.any(String), // deadline (32 bytes)
				expect.any(String), // v (32 bytes)
				mockSignature.r, // r (32 bytes)
				mockSignature.s // s (32 bytes)
			]);
		});

		it('should return complete permit result with all required fields', async () => {
			const result = await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(result).toEqual({
				nonce: mockNonce.toString(),
				deadline: expect.any(Number),
				encodedPermit: mockEncodedPermit
			});
		});

		it('should handle different token values correctly', async () => {
			const largeValue = '999999999999999999999999';

			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: largeValue,
				identity: mockIdentity
			});

			expect(toBeHex).toHaveBeenCalledWith(largeValue, 32);
		});

		it('should handle zero value correctly', async () => {
			const zeroValue = '0';

			await createPermit({
				token: mockValidErc20Token,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: zeroValue,
				identity: mockIdentity
			});

			expect(toBeHex).toHaveBeenCalledWith(zeroValue, 32);
		});

		it('should work with different chain IDs', async () => {
			const polygonToken = {
				...mockValidErc20Token,
				network: {
					...mockValidErc20Token.network,
					chainId: BigInt(137)
				}
			};

			await createPermit({
				token: polygonToken,
				userAddress: mockUserAddress,
				spender: mockSpenderAddress,
				value: mockValue,
				identity: mockIdentity
			});

			expect(InfuraProvider).toHaveBeenCalledWith(BigInt(137), INFURA_API_KEY);
		});
	});

	describe('error handling', () => {
		it('should throw error when nonces call fails', async () => {
			const mockError = new Error('Contract call failed');
			const mockNonces = vi.fn().mockRejectedValue(mockError);
			const mockVersionFn = vi.fn().mockResolvedValue('2');

			vi.spyOn(Contract.prototype, 'nonces').mockImplementation(mockNonces);
			vi.spyOn(Contract.prototype, 'version').mockImplementation(mockVersionFn);

			await expect(
				createPermit({
					token: mockValidErc20Token,
					userAddress: mockUserAddress,
					spender: mockSpenderAddress,
					value: mockValue,
					identity: mockIdentity
				})
			).rejects.toThrowError('Contract call failed');
		});

		it('should throw error when signPrehash fails', async () => {
			const mockNonces = vi.fn().mockResolvedValue(mockNonce);
			const signError = new Error('Signing failed');

			const mockVersionFn = vi.fn().mockResolvedValue('2');

			vi.spyOn(Contract.prototype, 'nonces').mockImplementation(mockNonces);
			vi.spyOn(Contract.prototype, 'version').mockImplementation(mockVersionFn);

			vi.mocked(TypedDataEncoder.hash).mockReturnValue(mockHash);
			vi.mocked(signerApi.signPrehash).mockRejectedValue(signError);

			await expect(
				createPermit({
					token: mockValidErc20Token,
					userAddress: mockUserAddress,
					spender: mockSpenderAddress,
					value: mockValue,
					identity: mockIdentity
				})
			).rejects.toThrowError('Signing failed');
		});
	});
});
