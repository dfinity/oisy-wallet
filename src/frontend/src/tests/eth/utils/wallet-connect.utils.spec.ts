import {
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_LEGACY,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN
} from '$eth/constants/wallet-connect.constants';
import type { WalletConnectEthSignTypedDataV4 } from '$eth/types/wallet-connect';
import {
	assertValidEthTypedData,
	getEthTypedDataApproval,
	getSendParamsGas,
	getSignParamsMessageTypedDataV4Hash,
	hasInvalidTypedData,
	isEthSignTypedDataMethod,
	toTypedDataDomainChainId,
	WalletConnectEthTypedDataError
} from '$eth/utils/wallet-connect.utils';
import { MAX_UINT_160, MAX_UINT_256, ZERO } from '$lib/constants/app.constants';
import { TypedDataEncoder, type TypedDataField } from 'ethers/hash';

// Every fixture below states chain 1 in its domain, so the session allowed to sign it is chain 1.
const MAINNET_SESSION = 'eip155:1';

const HOLDER = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';
const SPENDER = '0xcA11bde05977b3631167028862bE2a173976CA11';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ATTACKER = '0x2222222222222222222222222222222222222222';
const RECIPIENT = '0x1111111111111111111111111111111111111111';

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

// ERC-3009: a relayer submits such an authorization straight to the token
// contract, with no prior allowance, so the declared `to` and `value` are the
// whole of what the user gives away.
const transferWithAuthorization = (
	extra: Record<string, unknown> = {}
): WalletConnectEthSignTypedDataV4 => ({
	domain: { name: 'USD Coin', version: '2', chainId: '1', verifyingContract: USDC },
	types: {
		EIP712Domain: EIP712_DOMAIN,
		TransferWithAuthorization: [
			{ name: 'from', type: 'address' },
			{ name: 'to', type: 'address' },
			{ name: 'value', type: 'uint256' },
			{ name: 'validAfter', type: 'uint256' },
			{ name: 'validBefore', type: 'uint256' },
			{ name: 'nonce', type: 'bytes32' }
		]
	},
	primaryType: 'TransferWithAuthorization',
	message: {
		from: HOLDER,
		to: RECIPIENT,
		value: '5000000000',
		validAfter: '0',
		validBefore: '1893456000',
		nonce: `0x${'ab'.repeat(32)}`,
		...extra
	}
});

// The keys the summary used to be driven by. The schema above declares none of
// them, so none of them reaches the digest.
const UNDECLARED_SUMMARY_KEYS = {
	spender: ATTACKER,
	details: { token: USDC, amount: '1000000', expiration: '1800000000' }
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
			expect(() =>
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(daiPermit('false')),
					sessionChainId: MAINNET_SESSION
				})
			).toThrow(WalletConnectEthTypedDataError);
		});

		it('rejects a DAI permit whose bool `allowed` is the string "true"', () => {
			expect(() =>
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(daiPermit('true')),
					sessionChainId: MAINNET_SESSION
				})
			).toThrow(WalletConnectEthTypedDataError);
		});

		it.each([false, true])(
			'hashes a DAI permit whose bool `allowed` is the primitive %s exactly as ethers does',
			(allowed) => {
				const params = toParams(daiPermit(allowed));

				expect(
					getSignParamsMessageTypedDataV4Hash({ params, sessionChainId: MAINNET_SESSION })
				).toBe(ethersHash(daiPermit(allowed)));
			}
		);

		it('leaves a standard ERC-2612 permit (uint256 value) unaffected', () => {
			expect(
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(erc2612Permit),
					sessionChainId: MAINNET_SESSION
				})
			).toBe(ethersHash(erc2612Permit));
		});

		it('leaves a Permit2 request with nested structs unaffected', () => {
			expect(
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(permit2),
					sessionChainId: MAINNET_SESSION
				})
			).toBe(ethersHash(permit2));
		});

		it('rejects an ERC-3009 authorization carrying undeclared summary keys', () => {
			expect(() =>
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS)),
					sessionChainId: MAINNET_SESSION
				})
			).toThrow(WalletConnectEthTypedDataError);
		});

		it('leaves a canonical ERC-3009 authorization unaffected', () => {
			expect(
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(transferWithAuthorization()),
					sessionChainId: MAINNET_SESSION
				})
			).toBe(ethersHash(transferWithAuthorization()));
		});

		it('throws a non-typed-data error for a plain (non-JSON) message', () => {
			// A typed-data method whose payload is not typed-data JSON fails to hash,
			// and the request is rejected rather than signed.
			let caught: unknown;
			try {
				getSignParamsMessageTypedDataV4Hash({
					params: ['0xdeadbeef'],
					sessionChainId: MAINNET_SESSION
				});
			} catch (err: unknown) {
				caught = err;
			}

			expect(caught).toBeInstanceOf(Error);
			expect(caught).not.toBeInstanceOf(WalletConnectEthTypedDataError);
		});
	});

	describe('hasInvalidTypedData', () => {
		it('is true for a type-invalid v4 permit (bool sent as a string)', () => {
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(daiPermit('false')),
					sessionChainId: MAINNET_SESSION
				})
			).toBeTruthy();
		});

		it('is false for a valid v4 permit', () => {
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(daiPermit(true)),
					sessionChainId: MAINNET_SESSION
				})
			).toBeFalsy();
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(erc2612Permit),
					sessionChainId: MAINNET_SESSION
				})
			).toBeFalsy();
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(permit2),
					sessionChainId: MAINNET_SESSION
				})
			).toBeFalsy();
		});

		it('is true for an ERC-3009 authorization carrying undeclared summary keys', () => {
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS)),
					sessionChainId: MAINNET_SESSION
				})
			).toBeTruthy();
		});

		it('is false for a canonical ERC-3009 authorization', () => {
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(transferWithAuthorization()),
					sessionChainId: MAINNET_SESSION
				})
			).toBeFalsy();
		});

		it('is true for a type-invalid legacy typed-data permit', () => {
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_LEGACY,
					params: toParams(daiPermit('false')),
					sessionChainId: MAINNET_SESSION
				})
			).toBeTruthy();
		});

		it('is false for a raw-message method, even with a typed-data payload', () => {
			// personal_sign is signed as a raw message and must stay approvable.
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_PERSONAL_SIGN,
					params: ['0xdeadbeef'],
					sessionChainId: MAINNET_SESSION
				})
			).toBeFalsy();
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_PERSONAL_SIGN,
					params: toParams(daiPermit('false')),
					sessionChainId: MAINNET_SESSION
				})
			).toBeFalsy();
		});
	});

	describe('getSendParamsGas', () => {
		it('reads the hex quantity an eth_sendTransaction request quotes', () => {
			expect(getSendParamsGas('0x1e8480')).toBe(2_000_000n);
		});

		it('reads a decimal quantity', () => {
			expect(getSendParamsGas('21000')).toBe(21_000n);
		});

		it('is undefined when the request carries no gas limit', () => {
			expect(getSendParamsGas(undefined)).toBeUndefined();
		});

		it('is undefined for a quantity that is not a usable limit', () => {
			expect(getSendParamsGas('0x')).toBeUndefined();
			expect(getSendParamsGas('not-a-number')).toBeUndefined();
			expect(getSendParamsGas('')).toBeUndefined();
			expect(getSendParamsGas('0x0')).toBeUndefined();
			expect(getSendParamsGas('-1')).toBeUndefined();
		});
	});

	describe('isEthSignTypedDataMethod', () => {
		it('is true for the typed-data methods', () => {
			expect(isEthSignTypedDataMethod(SESSION_REQUEST_ETH_SIGN_V4)).toBeTruthy();
			expect(isEthSignTypedDataMethod(SESSION_REQUEST_ETH_SIGN_LEGACY)).toBeTruthy();
		});

		it('is false for the raw-message methods', () => {
			expect(isEthSignTypedDataMethod(SESSION_REQUEST_PERSONAL_SIGN)).toBeFalsy();
			expect(isEthSignTypedDataMethod(SESSION_REQUEST_ETH_SIGN)).toBeFalsy();
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

		it('rejects a message key the primary type does not declare', () => {
			const typedData = daiPermit(false);
			typedData.message.spenderLabel = 'Trusted dApp';

			expect(call(typedData)).toThrow(/Permit\.spenderLabel/);
		});

		it('rejects a key a nested struct does not declare', () => {
			const typedData = structuredClone(permit2);
			(typedData.message.details as Record<string, unknown>).label = 'Trusted dApp';

			expect(call(typedData)).toThrow(/PermitSingle\.details\.label/);
		});

		it('rejects the undeclared keys of the ERC-3009 authorization', () => {
			expect(call(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS))).toThrow(
				WalletConnectEthTypedDataError
			);
		});

		it('accepts a canonical ERC-3009 authorization', () => {
			expect(call(transferWithAuthorization())).not.toThrow();
		});
	});

	describe('digest coverage of the ERC-3009 authorization', () => {
		// The reason the undeclared keys are dangerous: they can be anything at all
		// without the user's signature changing by a single bit.
		it('is unchanged by every undeclared key', () => {
			expect(ethersHash(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS))).toBe(
				ethersHash(transferWithAuthorization())
			);
		});

		it.each([{ to: ATTACKER }, { value: '1000000' }, { from: SPENDER }])(
			'changes when the declared field %s changes',
			(mutation) => {
				expect(ethersHash(transferWithAuthorization(mutation))).not.toBe(
					ethersHash(transferWithAuthorization())
				);
			}
		);
	});

	describe('getEthTypedDataApproval', () => {
		it('summarizes a Permit2 request from its declared members', () => {
			expect(getEthTypedDataApproval(permit2)).toEqual({
				spender: SPENDER,
				token: DAI,
				amount: 123456789n,
				unlimited: false,
				expiration: 1761743754
			});
		});

		// Permit2 saturates at its declared uint160, not at the 256-bit maximum.
		it('calls a saturated Permit2 allowance unlimited', () => {
			const typedData = structuredClone(permit2);
			(typedData.message.details as Record<string, unknown>).amount = MAX_UINT_160.toString();

			expect(getEthTypedDataApproval(typedData)?.unlimited).toBeTruthy();
		});

		it('summarizes an ERC-2612 permit from its value, deadline and verifying contract', () => {
			expect(getEthTypedDataApproval(erc2612Permit)).toEqual({
				spender: SPENDER,
				// ERC-2612 names no token: the contract that verifies the permit is the token.
				token: DAI,
				amount: 1000000n,
				unlimited: false,
				expiration: 1893456000
			});
		});

		// The report this fixes: an unlimited permit summarized as a bare spender.
		it('calls a saturated ERC-2612 value unlimited', () => {
			const typedData = structuredClone(erc2612Permit);
			typedData.message.value = MAX_UINT_256.toString();

			expect(getEthTypedDataApproval(typedData)).toEqual({
				spender: SPENDER,
				token: DAI,
				amount: MAX_UINT_256,
				unlimited: true,
				expiration: 1893456000
			});
		});

		// "Never expires" is written as a saturated uint256, which is not a moment in time.
		it('states no expiration for a deadline no date can hold', () => {
			const typedData = structuredClone(erc2612Permit);
			typedData.message.deadline = MAX_UINT_256.toString();

			expect(getEthTypedDataApproval(typedData)?.expiration).toBeUndefined();
		});

		// DAI carries no amount: `allowed` is the allowance, and it is an unlimited one.
		it('summarizes an allowed DAI permit as unlimited', () => {
			expect(getEthTypedDataApproval(daiPermit(true))).toEqual({
				spender: SPENDER,
				token: DAI,
				amount: undefined,
				unlimited: true,
				expiration: 1893456000
			});
		});

		it('summarizes a cleared DAI permit as a revocation', () => {
			expect(getEthTypedDataApproval(daiPermit(false))).toEqual({
				spender: SPENDER,
				token: DAI,
				amount: ZERO,
				unlimited: false,
				expiration: 1893456000
			});
		});

		it('summarizes nothing for an ERC-3009 authorization carrying undeclared summary keys', () => {
			expect(
				getEthTypedDataApproval(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS))
			).toBeUndefined();
		});

		it('summarizes nothing for a canonical ERC-3009 authorization', () => {
			expect(getEthTypedDataApproval(transferWithAuthorization())).toBeUndefined();
		});

		it('summarizes nothing for an unrelated struct that declares spender and details', () => {
			// Duck-typing on the presence of those members would frame an arbitrary
			// struct as a token allowance, even though it grants no allowance.
			const typedData: WalletConnectEthSignTypedDataV4 = {
				domain: { name: 'Vote', chainId: '1', verifyingContract: DAI },
				types: {
					Vote: [
						{ name: 'details', type: 'VoteDetails' },
						{ name: 'spender', type: 'address' }
					],
					VoteDetails: [
						{ name: 'token', type: 'address' },
						{ name: 'amount', type: 'uint160' },
						{ name: 'expiration', type: 'uint48' }
					]
				},
				primaryType: 'Vote',
				message: {
					details: { token: DAI, amount: '1', expiration: '1761743754' },
					spender: SPENDER
				}
			};

			expect(getEthTypedDataApproval(typedData)).toBeUndefined();
		});

		it('summarizes nothing when a recognized schema carries a non-conforming value', () => {
			const typedData = structuredClone(permit2);
			(typedData.message.details as Record<string, unknown>).token = 'not-an-address';

			expect(getEthTypedDataApproval(typedData)).toBeUndefined();
		});
	});

	describe('toTypedDataDomainChainId', () => {
		// EIP-712 declares `chainId` as a uint256, so every one of these is chain 1 and all of them
		// hash to the same digest.
		it.each(['1', 1, 1n, '0x1', '01', '0x01'])('reads %s as the same chain', (chainId) => {
			expect(toTypedDataDomainChainId(chainId)).toBe(1n);
		});

		it.each([undefined, null, 'mainnet', '', {}, [], 1.5, '0x'])(
			'reads %s as no chain at all',
			(value) => {
				expect(toTypedDataDomainChainId(value)).not.toBe(1n);
			}
		);

		// The value comes from the dApp, so what it cannot read must not take the review down.
		it('does not throw on a value that is not a number', () => {
			expect(() => toTypedDataDomainChainId('mainnet')).not.toThrow();
			expect(toTypedDataDomainChainId('mainnet')).toBeUndefined();
		});
	});

	// The reported attack: a session granted only for a testnet asking for a signature over a
	// mainnet domain. The key is the same on every EVM chain, so nothing but this check stands
	// between that request and a digest real mainnet DAI would accept.
	describe('chain binding', () => {
		const SEPOLIA_SESSION = 'eip155:11155111';

		it('refuses a mainnet domain asked for by a testnet session', () => {
			expect(() =>
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(daiPermit(true)),
					sessionChainId: SEPOLIA_SESSION
				})
			).toThrow(WalletConnectEthTypedDataError);
		});

		it('refuses it in the review as well, so it cannot be approved', () => {
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(daiPermit(true)),
					sessionChainId: SEPOLIA_SESSION
				})
			).toBeTruthy();
		});

		// Omitting the envelope chain must not be a way around the check.
		it.each([undefined, '', 'eip155:999999', 'not-a-chain'])(
			'refuses when the session states %s as its chain',
			(sessionChainId) => {
				expect(() =>
					getSignParamsMessageTypedDataV4Hash({ params: toParams(daiPermit(true)), sessionChainId })
				).toThrow(WalletConnectEthTypedDataError);
			}
		);

		// A domain with no chain is bound to none, so it is valid on all of them.
		it('refuses a domain that states no chain at all', () => {
			const { chainId: _chainId, ...domain } = daiPermit(true).domain;

			expect(() =>
				getSignParamsMessageTypedDataV4Hash({
					params: toParams({ ...daiPermit(true), domain }),
					sessionChainId: MAINNET_SESSION
				})
			).toThrow(WalletConnectEthTypedDataError);
		});

		// A chain is a number, not a spelling: these are all chain 1 and all hash alike.
		it.each(['1', 1, '0x1', '01'])(
			'accepts %s as the same chain the session granted',
			(chainId) => {
				const permit = daiPermit(true);

				expect(
					getSignParamsMessageTypedDataV4Hash({
						params: toParams({ ...permit, domain: { ...permit.domain, chainId } }),
						sessionChainId: MAINNET_SESSION
					})
				).toBe(ethersHash({ ...permit, domain: { ...permit.domain, chainId } }));
			}
		);

		// Raw-message methods are signed differently and are not chain-bound.
		it('leaves a raw-message request approvable whatever the session chain', () => {
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN,
					params: toParams(daiPermit(true)),
					sessionChainId: SEPOLIA_SESSION
				})
			).toBeFalsy();
		});
	});
});
