import type { WalletConnectEthSignTypedDataV4 } from '$eth/types/wallet-connect';
import {
	assertValidEthTypedData,
	getSignParamsMessageTypedDataV4Hash,
	hasInvalidTypedDataParams,
	WalletConnectEthTypedDataError
} from '$eth/utils/wallet-connect.utils';
import { TypedDataEncoder, type TypedDataField } from 'ethers/hash';

const HOLDER = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';
const SPENDER = '0xcA11bde05977b3631167028862bE2a173976CA11';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';

const EIP712_DOMAIN: Array<TypedDataField> = [
	{ name: 'name', type: 'string' },
	{ name: 'version', type: 'string' },
	{ name: 'chainId', type: 'uint256' },
	{ name: 'verifyingContract', type: 'address' }
];

// DAI's non-standard permit declares `allowed` as a bool — a realistic fixture
// for exercising bool-type validation.
const daiPermit = (allowed: unknown): WalletConnectEthSignTypedDataV4 => ({
	domain: { name: 'Dai Stablecoin', version: '1', chainId: '1', verifyingContract: DAI },
	types: {
		EIP712Domain: EIP712_DOMAIN,
		Permit: [
			{ name: 'holder', type: 'address' },
			{ name: 'spender', type: 'address' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'expiry', type: 'uint256' },
			{ name: 'allowed', type: 'bool' }
		]
	},
	primaryType: 'Permit',
	message: { holder: HOLDER, spender: SPENDER, nonce: '0', expiry: '1893456000', allowed }
});

// Standard ERC-2612 permit: the approval amount is a uint256, not a bool.
const erc2612Permit: WalletConnectEthSignTypedDataV4 = {
	domain: { name: 'USD Coin', version: '2', chainId: '1', verifyingContract: DAI },
	types: {
		EIP712Domain: EIP712_DOMAIN,
		Permit: [
			{ name: 'owner', type: 'address' },
			{ name: 'spender', type: 'address' },
			{ name: 'value', type: 'uint256' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' }
		]
	},
	primaryType: 'Permit',
	message: { owner: HOLDER, spender: SPENDER, value: '1000000', nonce: '0', deadline: '1893456000' }
};

// Uniswap Permit2, exercising nested structs.
const permit2: WalletConnectEthSignTypedDataV4 = {
	domain: { name: 'Permit2', chainId: '1', verifyingContract: SPENDER },
	types: {
		EIP712Domain: [
			{ name: 'name', type: 'string' },
			{ name: 'chainId', type: 'uint256' },
			{ name: 'verifyingContract', type: 'address' }
		],
		PermitSingle: [
			{ name: 'details', type: 'PermitDetails' },
			{ name: 'spender', type: 'address' },
			{ name: 'sigDeadline', type: 'uint256' }
		],
		PermitDetails: [
			{ name: 'token', type: 'address' },
			{ name: 'amount', type: 'uint160' },
			{ name: 'expiration', type: 'uint48' },
			{ name: 'nonce', type: 'uint48' }
		]
	},
	primaryType: 'PermitSingle',
	message: {
		details: { token: DAI, amount: '123456789', expiration: '1761743754', nonce: '0' },
		spender: SPENDER,
		sigDeadline: '1759153554'
	}
};

const toParams = (typedData: WalletConnectEthSignTypedDataV4): string[] => [
	HOLDER,
	JSON.stringify(typedData)
];

// The hash ethers produces for a valid payload, used to prove that validation
// leaves legitimate requests byte-for-byte unchanged.
const ethersHash = ({ domain, types, message }: WalletConnectEthSignTypedDataV4): string => {
	const { EIP712Domain: _EIP712Domain, ...rest } = types;
	return TypedDataEncoder.hash(domain, rest, message);
};

describe('wallet-connect.utils', () => {
	describe('getSignParamsMessageTypedDataV4Hash', () => {
		it('rejects a DAI permit whose bool `allowed` is the string "false"', () => {
			expect(() => getSignParamsMessageTypedDataV4Hash(toParams(daiPermit('false')))).toThrow(
				WalletConnectEthTypedDataError
			);
		});

		it('rejects a DAI permit whose bool `allowed` is the string "true"', () => {
			expect(() => getSignParamsMessageTypedDataV4Hash(toParams(daiPermit('true')))).toThrow(
				WalletConnectEthTypedDataError
			);
		});

		it.each([false, true])(
			'hashes a DAI permit whose bool `allowed` is the primitive %s exactly as ethers does',
			(allowed) => {
				const params = toParams(daiPermit(allowed));

				expect(getSignParamsMessageTypedDataV4Hash(params)).toBe(ethersHash(daiPermit(allowed)));
			}
		);

		it('leaves a standard ERC-2612 permit (uint256 value) unaffected', () => {
			expect(getSignParamsMessageTypedDataV4Hash(toParams(erc2612Permit))).toBe(
				ethersHash(erc2612Permit)
			);
		});

		it('leaves a Permit2 request with nested structs unaffected', () => {
			expect(getSignParamsMessageTypedDataV4Hash(toParams(permit2))).toBe(ethersHash(permit2));
		});

		it('throws a non-typed-data error for a plain (non-JSON) message', () => {
			// personal_sign / eth_sign carry a hex string, not typed-data JSON. The
			// caller relies on this NOT being a WalletConnectEthTypedDataError so it
			// can fall back to raw message signing.
			let caught: unknown;
			try {
				getSignParamsMessageTypedDataV4Hash(['0xdeadbeef']);
			} catch (err: unknown) {
				caught = err;
			}

			expect(caught).toBeInstanceOf(Error);
			expect(caught).not.toBeInstanceOf(WalletConnectEthTypedDataError);
		});
	});

	describe('hasInvalidTypedDataParams', () => {
		it('is true for a type-invalid permit (bool sent as a string)', () => {
			expect(hasInvalidTypedDataParams(toParams(daiPermit('false')))).toBeTruthy();
		});

		it('is false for a valid permit', () => {
			expect(hasInvalidTypedDataParams(toParams(daiPermit(true)))).toBeFalsy();
			expect(hasInvalidTypedDataParams(toParams(erc2612Permit))).toBeFalsy();
			expect(hasInvalidTypedDataParams(toParams(permit2))).toBeFalsy();
		});

		it('is false for a plain (non-typed-data) message', () => {
			// personal_sign carries a hex string, not typed data, and must not warn.
			expect(hasInvalidTypedDataParams(['0xdeadbeef'])).toBeFalsy();
		});
	});

	describe('assertValidEthTypedData', () => {
		const call = (typedData: WalletConnectEthSignTypedDataV4) => {
			const { EIP712Domain: _EIP712Domain, ...types } = typedData.types;
			return () =>
				assertValidEthTypedData({
					types,
					primaryType: typedData.primaryType,
					message: typedData.message
				});
		};

		it('accepts primitive booleans', () => {
			expect(call(daiPermit(true))).not.toThrow();
			expect(call(daiPermit(false))).not.toThrow();
		});

		it.each(['false', 'true', '0', '', 0, 1, null, {}, []])(
			'rejects the non-boolean bool value %s',
			(allowed) => {
				expect(call(daiPermit(allowed))).toThrow(WalletConnectEthTypedDataError);
			}
		);

		it('reports the path of the offending value', () => {
			expect(call(daiPermit('false'))).toThrow(/Permit\.allowed/);
		});

		it('rejects an invalid bool nested inside a struct', () => {
			const typedData = structuredClone(permit2);
			typedData.types.PermitDetails.push({ name: 'flag', type: 'bool' });
			(typedData.message.details as Record<string, unknown>).flag = 'false';

			expect(call(typedData)).toThrow(/PermitSingle\.details\.flag/);
		});

		it('validates every element of an array', () => {
			const typedData: WalletConnectEthSignTypedDataV4 = {
				domain: { name: 'Test', chainId: '1', verifyingContract: DAI },
				types: { Batch: [{ name: 'flags', type: 'bool[]' }] },
				primaryType: 'Batch',
				message: { flags: [true, false, 'false'] }
			};

			expect(call(typedData)).toThrow(/Batch\.flags\[2\]/);
		});

		it('accepts a valid array', () => {
			const typedData: WalletConnectEthSignTypedDataV4 = {
				domain: { name: 'Test', chainId: '1', verifyingContract: DAI },
				types: { Batch: [{ name: 'flags', type: 'bool[]' }] },
				primaryType: 'Batch',
				message: { flags: [true, false, true] }
			};

			expect(call(typedData)).not.toThrow();
		});

		it('enforces a fixed array length', () => {
			const typedData: WalletConnectEthSignTypedDataV4 = {
				domain: { name: 'Test', chainId: '1', verifyingContract: DAI },
				types: { Batch: [{ name: 'flags', type: 'bool[2]' }] },
				primaryType: 'Batch',
				message: { flags: [true, false, true] }
			};

			expect(call(typedData)).toThrow(WalletConnectEthTypedDataError);
		});

		it.each(['not-an-address', '0x1234', SPENDER.slice(0, -1), 42])(
			'rejects invalid address %s',
			(spender) => {
				expect(call(daiPermit(false))).not.toThrow();

				const typedData = daiPermit(false);
				typedData.message.spender = spender;

				expect(call(typedData)).toThrow(/Permit\.spender/);
			}
		);

		it('accepts integers as decimal string, hex string and number, and range-checks them', () => {
			const withNonce = (nonce: unknown): WalletConnectEthSignTypedDataV4 => {
				const typedData = daiPermit(false);
				typedData.message.nonce = nonce;
				return typedData;
			};

			expect(call(withNonce('42'))).not.toThrow();
			expect(call(withNonce('0x2a'))).not.toThrow();
			expect(call(withNonce(42))).not.toThrow();

			// Beyond uint256 max.
			expect(call(withNonce((2n ** 256n).toString()))).toThrow(WalletConnectEthTypedDataError);
			// Negative for an unsigned type.
			expect(call(withNonce('-1'))).toThrow(WalletConnectEthTypedDataError);
			// Non-numeric.
			expect(call(withNonce('abc'))).toThrow(WalletConnectEthTypedDataError);
		});

		it('rejects a fixed-bytes value of the wrong length', () => {
			const typedData: WalletConnectEthSignTypedDataV4 = {
				domain: { name: 'Test', chainId: '1', verifyingContract: DAI },
				types: { Blob: [{ name: 'hash', type: 'bytes32' }] },
				primaryType: 'Blob',
				message: { hash: '0x1234' }
			};

			expect(call(typedData)).toThrow(WalletConnectEthTypedDataError);
		});

		it('rejects a missing required field', () => {
			const typedData = daiPermit(false);
			delete (typedData.message as Record<string, unknown>).allowed;

			expect(call(typedData)).toThrow(/Permit\.allowed/);
		});
	});
});
