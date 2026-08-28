import { ERC_SET_APPROVAL_FOR_ALL_HASH } from '$eth/constants/erc.constants';
import {
	ERC20_APPROVE_HASH,
	ERC20_DECREASE_ALLOWANCE_HASH,
	ERC20_INCREASE_ALLOWANCE_HASH,
	ERC20_TRANSFER_HASH
} from '$eth/constants/erc20.constants';
import {
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_LEGACY,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN
} from '$eth/constants/wallet-connect.constants';
import type { WalletConnectEthSignTypedDataV4 } from '$eth/types/wallet-connect';
import {
	assertValidEthTypedData,
	classifyWalletConnectEthCall,
	getEthTypedDataApproval,
	getEthTypedDataMethods,
	getSendParamsGas,
	getSignedEthTypedData,
	getSignParamsMessageTypedDataV4Hash,
	hasInvalidTypedData,
	hasUnreviewableTypedData,
	isEthSignTypedDataMethod,
	isWalletConnectEthApproval,
	toTypedDataDomainChainId,
	WalletConnectEthTypedDataError
} from '$eth/utils/wallet-connect.utils';
import { MAX_UINT_160, MAX_UINT_256, ZERO } from '$lib/constants/app.constants';
import { TypedDataEncoder, type TypedDataField } from 'ethers/hash';

// The fixtures below state chain 1 in their domain, so the session allowed to sign them is chain 1
// — bar the Hyperliquid one, which states Arbitrum.
const MAINNET_SESSION = 'eip155:1';
const ARBITRUM_SESSION = 'eip155:42161';

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

// Hyperliquid asks every action to be signed with routing fields (`type`, `signatureChainId`) that
// its schema does not declare, so the request is only signable if such keys are tolerated.
const hyperliquidAcceptTerms: WalletConnectEthSignTypedDataV4 = {
	domain: {
		name: 'HyperliquidSignTransaction',
		version: '1',
		chainId: 42161,
		verifyingContract: '0x0000000000000000000000000000000000000000'
	},
	types: {
		EIP712Domain: EIP712_DOMAIN,
		'Hyperliquid:AcceptTerms': [
			{ name: 'hyperliquidChain', type: 'string' },
			{ name: 'time', type: 'uint64' }
		]
	},
	primaryType: 'Hyperliquid:AcceptTerms',
	message: {
		type: 'acceptTerms',
		time: 1787170393018,
		signatureChainId: '0xa4b1',
		hyperliquidChain: 'Mainnet'
	}
};

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

		it('hashes an ERC-3009 authorization carrying undeclared keys exactly as ethers does', () => {
			// The keys the schema does not declare are not encoded, so the digest is the canonical
			// one: refusing to hash would have rejected a request that every other wallet signs.
			expect(
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS)),
					sessionChainId: MAINNET_SESSION
				})
			).toBe(ethersHash(transferWithAuthorization()));
		});

		it('hashes the Hyperliquid accept-terms action exactly as ethers does', () => {
			expect(
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(hyperliquidAcceptTerms),
					sessionChainId: ARBITRUM_SESSION
				})
			).toBe(ethersHash(hyperliquidAcceptTerms));
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

		it('is false for an ERC-3009 authorization carrying undeclared keys', () => {
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS)),
					sessionChainId: MAINNET_SESSION
				})
			).toBeFalsy();
		});

		it('is false for the Hyperliquid accept-terms action', () => {
			expect(
				hasInvalidTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(hyperliquidAcceptTerms),
					sessionChainId: ARBITRUM_SESSION
				})
			).toBeFalsy();
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

	describe('classifyWalletConnectEthCall', () => {
		const args = 'de'.repeat(64);

		it.each([undefined, '', '0x', '0X'])('should classify %s as a native transfer', (data) => {
			expect(classifyWalletConnectEthCall(data)).toEqual({ type: 'native' });
		});

		it.each([
			{ selector: ERC20_APPROVE_HASH, expected: { type: 'erc20Approve' } },
			{ selector: ERC20_TRANSFER_HASH, expected: { type: 'erc20Transfer' } },
			{ selector: ERC_SET_APPROVAL_FOR_ALL_HASH, expected: { type: 'setApprovalForAll' } },
			{
				selector: ERC20_INCREASE_ALLOWANCE_HASH,
				expected: { type: 'erc20AllowanceDelta', increase: true }
			},
			{
				selector: ERC20_DECREASE_ALLOWANCE_HASH,
				expected: { type: 'erc20AllowanceDelta', increase: false }
			}
		])('should classify the call behind selector $selector', ({ selector, expected }) => {
			expect(classifyWalletConnectEthCall(`${selector}${args}`)).toEqual(expected);
		});

		it('should classify a selector regardless of its casing', () => {
			const upper = ERC20_INCREASE_ALLOWANCE_HASH.toUpperCase().replace('0X', '0x');

			expect(classifyWalletConnectEthCall(`${upper}${args}`)).toEqual({
				type: 'erc20AllowanceDelta',
				increase: true
			});
		});

		// The behaviour the whole change exists for. Each of these is a selector that was never
		// considered, and each used to be reviewed as a native zero-value send.
		it.each([
			// Uniswap Permit2 `approve`
			'0x87517c45',
			// ERC-2612 `permit`
			'0xd505accf',
			// ERC-20 `transferFrom`
			'0x23b872dd',
			// a router `execute`
			'0x3593564c',
			// nothing at all
			'0xdeadbeef'
		])('should classify unrecognised selector %s as unknown', (selector) => {
			expect(classifyWalletConnectEthCall(`${selector}${args}`)).toEqual({
				type: 'unknown',
				selector
			});
		});

		it('should classify calldata too short to carry a selector as unknown, naming none', () => {
			expect(classifyWalletConnectEthCall('0xab')).toEqual({
				type: 'unknown',
				selector: undefined
			});
		});

		// A known selector says nothing about the arguments behind it. Recognising the call is what
		// routes it to a review that decodes those arguments and fails closed when they do not.
		it('should classify a known selector carrying garbage arguments by its selector', () => {
			expect(classifyWalletConnectEthCall(`${ERC20_INCREASE_ALLOWANCE_HASH}deadbeef`)).toEqual({
				type: 'erc20AllowanceDelta',
				increase: true
			});
		});
	});

	describe('isWalletConnectEthApproval', () => {
		it.each([
			{ type: 'erc20Approve' as const },
			{ type: 'setApprovalForAll' as const },
			{ type: 'erc20AllowanceDelta' as const, increase: true },
			{ type: 'erc20AllowanceDelta' as const, increase: false }
		])('should treat $type as an approval', (call) => {
			expect(isWalletConnectEthApproval(call)).toBeTruthy();
		});

		// Not an approval, and not a send either: the modal titles it for what it is.
		it.each([
			{ type: 'native' as const },
			{ type: 'erc20Transfer' as const },
			{ type: 'unknown' as const, selector: '0xdeadbeef' }
		])('should not treat $type as an approval', (call) => {
			expect(isWalletConnectEthApproval(call)).toBeFalsy();
		});
	});

	describe('getEthTypedDataMethods', () => {
		it('should name the struct an ERC-2612 permit hashes', () => {
			expect(getEthTypedDataMethods(erc2612Permit)).toEqual([{ name: 'Permit', depth: 0 }]);
		});

		it('should name the root first and the structs it declares beneath it', () => {
			expect(getEthTypedDataMethods(permit2)).toEqual([
				{ name: 'PermitSingle', depth: 0 },
				{ name: 'PermitDetails', depth: 1 }
			]);
		});

		it('should name the ERC-3009 authorization the review could not describe', () => {
			expect(getEthTypedDataMethods(transferWithAuthorization())).toEqual([
				{ name: 'TransferWithAuthorization', depth: 0 }
			]);
		});

		it('should leave the domain out, since it separates the digest rather than being hashed into it', () => {
			expect(getEthTypedDataMethods(erc2612Permit).map(({ name }) => name)).not.toContain(
				'EIP712Domain'
			);
		});

		// The declared `primaryType` is not what gets hashed: ethers derives the root from the type
		// graph. Naming the declared field would let a payload present itself as a struct its own
		// signature does not cover.
		it('should name the derived root, not the primaryType the payload declares', () => {
			const typedData: WalletConnectEthSignTypedDataV4 = {
				...transferWithAuthorization(),
				primaryType: 'Login'
			};

			expect(getEthTypedDataMethods(typedData)).toEqual([
				{ name: 'TransferWithAuthorization', depth: 0 }
			]);
		});

		it('should name nothing when the root cannot be resolved', () => {
			expect(
				getEthTypedDataMethods({
					domain: {},
					types: {
						A: [{ name: 'b', type: 'B' }],
						B: [{ name: 'a', type: 'A' }]
					},
					primaryType: 'A',
					message: {}
				})
			).toEqual([]);
		});
	});

	describe('hasUnreviewableTypedData', () => {
		const call = (typedData: WalletConnectEthSignTypedDataV4) =>
			hasUnreviewableTypedData({
				method: SESSION_REQUEST_ETH_SIGN_V4,
				params: toParams(typedData),
				sessionChainId: MAINNET_SESSION
			});

		// The schemas OISY can summarize. These are the only ones that must not reach the warning.
		it.each([
			{ name: 'Permit2 PermitSingle', typedData: permit2 },
			{ name: 'ERC-2612 Permit', typedData: erc2612Permit },
			{ name: 'DAI Permit', typedData: daiPermit(true) }
		])('should not warn about a recognised $name', ({ typedData }) => {
			expect(call(typedData)).toBeFalsy();
		});

		// The report that would have come next. An ERC-3009 authorization lets whoever holds the
		// signature pull the stated value out of the wallet, and the review said nothing about it.
		it('should warn about an ERC-3009 authorization', () => {
			expect(call(transferWithAuthorization())).toBeTruthy();
		});

		it('should warn about a struct that is nothing OISY knows', () => {
			expect(
				call({
					domain: { name: 'Marketplace', version: '1', chainId: '1', verifyingContract: USDC },
					types: {
						EIP712Domain: EIP712_DOMAIN,
						Order: [
							{ name: 'offerer', type: 'address' },
							{ name: 'price', type: 'uint256' }
						]
					},
					primaryType: 'Order',
					message: { offerer: HOLDER, price: '1' }
				})
			).toBeTruthy();
		});

		// Already warned about and blocked by hasInvalidTypedData. Reporting it here as well would
		// put two warnings on one request and let the acknowledgement re-enable a blocked signature.
		it('should not warn about typed data that would not be signed at all', () => {
			expect(call(daiPermit('true'))).toBeFalsy();
		});

		it('should not warn about typed data on a chain the session was not granted', () => {
			expect(
				hasUnreviewableTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: toParams(transferWithAuthorization()),
					sessionChainId: ARBITRUM_SESSION
				})
			).toBeFalsy();
		});

		// A raw message carries no schema, so nothing about it can be silently missing: what is
		// shown is what is signed.
		it.each([SESSION_REQUEST_PERSONAL_SIGN, SESSION_REQUEST_ETH_SIGN])(
			'should not warn about %s',
			(method) => {
				expect(
					hasUnreviewableTypedData({
						method,
						params: toParams(transferWithAuthorization()),
						sessionChainId: MAINNET_SESSION
					})
				).toBeFalsy();
			}
		);

		it('should not warn about a payload that is not typed data at all', () => {
			expect(
				hasUnreviewableTypedData({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: ['0xnot-json'],
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

		// A key the primary type does not declare is not encoded, so it says nothing about whether
		// the request conforms to its schema. It is dropped from the preview rather than rejected:
		// see the `getSignedEthTypedData` suite.
		it('accepts a message key the primary type does not declare', () => {
			const typedData = daiPermit(false);
			typedData.message.spenderLabel = 'Trusted dApp';

			expect(call(typedData)).not.toThrow();
		});

		it('accepts a key a nested struct does not declare', () => {
			const typedData = structuredClone(permit2);
			(typedData.message.details as Record<string, unknown>).label = 'Trusted dApp';

			expect(call(typedData)).not.toThrow();
		});

		it('accepts the undeclared keys of the ERC-3009 authorization', () => {
			expect(call(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS))).not.toThrow();
		});

		it('still rejects a declared member of the wrong type alongside undeclared keys', () => {
			expect(call(daiPermit('true'))).toThrow(WalletConnectEthTypedDataError);
		});

		it('accepts a canonical ERC-3009 authorization', () => {
			expect(call(transferWithAuthorization())).not.toThrow();
		});
	});

	describe('getSignedEthTypedData', () => {
		it('leaves a payload whose every key is declared untouched', () => {
			expect(getSignedEthTypedData(permit2)).toEqual({
				typedData: permit2,
				hasUnsignedKeys: false
			});
		});

		it('drops the routing fields of the Hyperliquid accept-terms action', () => {
			const { typedData, hasUnsignedKeys } = getSignedEthTypedData(hyperliquidAcceptTerms);

			expect(hasUnsignedKeys).toBeTruthy();
			expect(typedData.message).toEqual({ hyperliquidChain: 'Mainnet', time: 1787170393018 });
		});

		it('previews only what the digest covers', () => {
			const { typedData } = getSignedEthTypedData(
				transferWithAuthorization(UNDECLARED_SUMMARY_KEYS)
			);

			expect(ethersHash({ ...typedData, message: typedData.message })).toBe(
				ethersHash(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS))
			);
			expect(typedData.message).toEqual(transferWithAuthorization().message);
		});

		it('drops a key a nested struct does not declare', () => {
			const withNestedKey = structuredClone(permit2);
			(withNestedKey.message.details as Record<string, unknown>).label = 'Trusted dApp';

			const { typedData, hasUnsignedKeys } = getSignedEthTypedData(withNestedKey);

			expect(hasUnsignedKeys).toBeTruthy();
			expect(typedData.message).toEqual(permit2.message);
		});

		it('drops a key an array item does not declare', () => {
			const typedData: WalletConnectEthSignTypedDataV4 = {
				domain: { name: 'Batch', chainId: '1', verifyingContract: DAI },
				types: {
					Batch: [{ name: 'calls', type: 'Call[]' }],
					Call: [{ name: 'to', type: 'address' }]
				},
				primaryType: 'Batch',
				message: { calls: [{ to: RECIPIENT, label: 'Trusted dApp' }] }
			};

			expect(getSignedEthTypedData(typedData)).toEqual({
				typedData: { ...typedData, message: { calls: [{ to: RECIPIENT }] } },
				hasUnsignedKeys: true
			});
		});

		it('previews typed data whose primary type cannot be resolved as it came', () => {
			// Such a request is rejected for signing anyway, so there is no schema to project it onto.
			const typedData: WalletConnectEthSignTypedDataV4 = {
				domain: { name: 'Cycle', chainId: '1', verifyingContract: DAI },
				types: {
					A: [{ name: 'b', type: 'B' }],
					B: [{ name: 'a', type: 'A' }]
				},
				primaryType: 'A',
				message: { b: { a: {} } }
			};

			expect(getSignedEthTypedData(typedData)).toEqual({ typedData, hasUnsignedKeys: false });
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
