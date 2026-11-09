import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { CKETH_ABI, CKETH_DEPOSIT_HASH } from '$eth/constants/cketh.constants';
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
	classifyWalletConnectEthSendTransaction,
	getEthTypedDataApproval,
	getEthTypedDataMethods,
	getEthTypedDataPrimaryType,
	getSendParamsGas,
	getSignedEthTypedData,
	getSignParamsMessageTypedDataV4Hash,
	getWalletConnectEthCkEthDeposit,
	hasInvalidTypedData,
	hasUnreviewableTypedData,
	isEthSignTypedDataMethod,
	isWalletConnectEthApproval,
	isWalletConnectEthTokenCallWithValue,
	toTypedDataDomainChainId,
	toWalletConnectCkEthHelperContractAddress,
	WalletConnectEthCkEthDepositError,
	WalletConnectEthCkEthHelperUnconfirmedError,
	WalletConnectEthTypedDataError
} from '$eth/utils/wallet-connect.utils';
import { MAX_UINT_160, MAX_UINT_256, ZERO } from '$lib/constants/app.constants';
import { mockCkMinterInfo } from '$tests/mocks/ck-minter.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import { encodePrincipalToEthAddress } from '@icp-sdk/canisters/cketh';
import { Principal } from '@icp-sdk/core/principal';
import { Interface } from 'ethers/abi';
import { id, TypedDataEncoder, type TypedDataField } from 'ethers/hash';

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

// Uniswap Permit2, one signature setting an allowance over several tokens for one spender.
const permit2Batch: WalletConnectEthSignTypedDataV4 = {
	domain: permit2.domain,
	types: {
		EIP712Domain: permit2.types.EIP712Domain,
		PermitBatch: [
			{ name: 'details', type: 'PermitDetails[]' },
			{ name: 'spender', type: 'address' },
			{ name: 'sigDeadline', type: 'uint256' }
		],
		PermitDetails: permit2.types.PermitDetails
	},
	primaryType: 'PermitBatch',
	message: {
		details: [
			{ token: DAI, amount: '123456789', expiration: '1761743754', nonce: '0' },
			{ token: USDC, amount: MAX_UINT_160.toString(), expiration: '1761743755', nonce: '1' }
		],
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

// ERC-3009's other authorization: the same transfer, which only its recipient may submit.
const receiveWithAuthorization: WalletConnectEthSignTypedDataV4 = {
	domain: transferWithAuthorization().domain,
	types: {
		EIP712Domain: EIP712_DOMAIN,
		ReceiveWithAuthorization: transferWithAuthorization().types.TransferWithAuthorization
	},
	primaryType: 'ReceiveWithAuthorization',
	message: transferWithAuthorization().message
};

const PERMIT2_TOKEN_PERMISSIONS: Array<TypedDataField> = [
	{ name: 'token', type: 'address' },
	{ name: 'amount', type: 'uint256' }
];

// Uniswap Permit2 signature transfer: the spender may move up to the permitted amount once, to an
// address it picks when it does.
const permit2Transfer: WalletConnectEthSignTypedDataV4 = {
	domain: permit2.domain,
	types: {
		EIP712Domain: permit2.types.EIP712Domain,
		PermitTransferFrom: [
			{ name: 'permitted', type: 'TokenPermissions' },
			{ name: 'spender', type: 'address' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' }
		],
		TokenPermissions: PERMIT2_TOKEN_PERMISSIONS
	},
	primaryType: 'PermitTransferFrom',
	message: {
		permitted: { token: USDC, amount: '250000000' },
		spender: SPENDER,
		nonce: '7',
		deadline: '1893456000'
	}
};

const permit2BatchTransfer: WalletConnectEthSignTypedDataV4 = {
	domain: permit2.domain,
	types: {
		EIP712Domain: permit2.types.EIP712Domain,
		PermitBatchTransferFrom: [
			{ name: 'permitted', type: 'TokenPermissions[]' },
			{ name: 'spender', type: 'address' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' }
		],
		TokenPermissions: PERMIT2_TOKEN_PERMISSIONS
	},
	primaryType: 'PermitBatchTransferFrom',
	message: {
		permitted: [
			{ token: USDC, amount: '250000000' },
			{ token: DAI, amount: MAX_UINT_256.toString() }
		],
		spender: SPENDER,
		nonce: '7',
		deadline: '1893456000'
	}
};

// The witness a dApp binds a Permit2 transfer to, shaped like an order: its own structs, nested.
const WITNESS_TYPES: Record<string, Array<TypedDataField>> = {
	Order: [
		{ name: 'info', type: 'OrderInfo' },
		{ name: 'outputAmount', type: 'uint256' }
	],
	OrderInfo: [
		{ name: 'swapper', type: 'address' },
		{ name: 'deadline', type: 'uint256' }
	]
};

const WITNESS = { info: { swapper: HOLDER, deadline: '1893456000' }, outputAmount: '1' };

const permit2WitnessTransfer: WalletConnectEthSignTypedDataV4 = {
	domain: permit2.domain,
	types: {
		EIP712Domain: permit2.types.EIP712Domain,
		PermitWitnessTransferFrom: [
			...permit2Transfer.types.PermitTransferFrom,
			{ name: 'witness', type: 'Order' }
		],
		TokenPermissions: PERMIT2_TOKEN_PERMISSIONS,
		...WITNESS_TYPES
	},
	primaryType: 'PermitWitnessTransferFrom',
	message: { ...permit2Transfer.message, witness: WITNESS }
};

const permit2BatchWitnessTransfer: WalletConnectEthSignTypedDataV4 = {
	domain: permit2.domain,
	types: {
		EIP712Domain: permit2.types.EIP712Domain,
		PermitBatchWitnessTransferFrom: [
			...permit2BatchTransfer.types.PermitBatchTransferFrom,
			{ name: 'witness', type: 'Order' }
		],
		TokenPermissions: PERMIT2_TOKEN_PERMISSIONS,
		...WITNESS_TYPES
	},
	primaryType: 'PermitBatchWitnessTransferFrom',
	message: { ...permit2BatchTransfer.message, witness: WITNESS }
};

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

	describe('ckETH helper contract deposits', () => {
		// The ckETH helper contract on Ethereum mainnet, as the minter returns it.
		const CKETH_HELPER = '0x7574eB42cA208A4f6960ECCAfDF186D627dCC175';

		const OTHER_PRINCIPAL = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');

		const encodeDeposit = (principal: Principal): string =>
			new Interface(CKETH_ABI).encodeFunctionData('deposit', [
				encodePrincipalToEthAddress(principal)
			]);

		const ownDeposit = encodeDeposit(mockPrincipal);

		const minterInfoWithHelper = (helper: string) => ({
			data: { ...mockCkMinterInfo, eth_helper_contract_address: toNullable(helper) },
			certified: true
		});

		const minterInfo = minterInfoWithHelper(CKETH_HELPER);

		const params = {
			to: CKETH_HELPER,
			data: ownDeposit,
			networkId: ETHEREUM_NETWORK_ID,
			minterInfo,
			principal: mockPrincipal
		};

		describe('toWalletConnectCkEthHelperContractAddress', () => {
			it.each([
				{ network: 'Ethereum', networkId: ETHEREUM_NETWORK_ID },
				{ network: 'Sepolia', networkId: SEPOLIA_NETWORK_ID }
			])(
				'should read the helper contract off the minter information on $network',
				({ networkId }) => {
					expect(toWalletConnectCkEthHelperContractAddress({ networkId, minterInfo })).toBe(
						CKETH_HELPER
					);
				}
			);

			it('should name no helper contract on an EVM network without ckETH', () => {
				expect(
					toWalletConnectCkEthHelperContractAddress({ networkId: BASE_NETWORK_ID, minterInfo })
				).toBeUndefined();
			});

			it.each([undefined, null])(
				'should name no helper contract without minter information (%s)',
				(missing) => {
					expect(
						toWalletConnectCkEthHelperContractAddress({
							networkId: ETHEREUM_NETWORK_ID,
							minterInfo: missing
						})
					).toBeUndefined();
				}
			);
		});

		describe('getWalletConnectEthCkEthDeposit', () => {
			it('should return the principal of the user for a deposit to it', () => {
				expect(getWalletConnectEthCkEthDeposit(params)?.toText()).toBe(mockPrincipal.toText());
			});

			it.each([
				{ to: CKETH_HELPER.toLowerCase(), helper: CKETH_HELPER },
				{ to: CKETH_HELPER, helper: CKETH_HELPER.toLowerCase() },
				{ to: `0x${CKETH_HELPER.slice(2).toUpperCase()}`, helper: CKETH_HELPER }
			])(
				'should hold $to to the helper contract however its address is cased',
				({ to, helper }) => {
					const casedParams = { ...params, to, minterInfo: minterInfoWithHelper(helper) };

					expect(() =>
						getWalletConnectEthCkEthDeposit({
							...casedParams,
							data: encodeDeposit(OTHER_PRINCIPAL)
						})
					).toThrow(WalletConnectEthCkEthDepositError);

					expect(getWalletConnectEthCkEthDeposit(casedParams)?.toText()).toBe(
						mockPrincipal.toText()
					);
				}
			);

			it('should hold a deposit on Sepolia to its helper contract as well', () => {
				expect(() =>
					getWalletConnectEthCkEthDeposit({
						...params,
						networkId: SEPOLIA_NETWORK_ID,
						data: encodeDeposit(OTHER_PRINCIPAL)
					})
				).toThrow(WalletConnectEthCkEthDepositError);
			});

			// The minter information in the store for another chain's token is still Ethereum's, so the
			// address it names is not the ckETH helper there.
			it('should not check a deposit on an EVM network without ckETH', () => {
				expect(
					getWalletConnectEthCkEthDeposit({
						...params,
						networkId: BASE_NETWORK_ID,
						data: encodeDeposit(OTHER_PRINCIPAL)
					})
				).toBeUndefined();
			});

			it('should throw for a deposit to another principal', () => {
				expect(() =>
					getWalletConnectEthCkEthDeposit({ ...params, data: encodeDeposit(OTHER_PRINCIPAL) })
				).toThrow(WalletConnectEthCkEthDepositError);
			});

			it('should throw for a deposit when no user is signed in', () => {
				expect(() => getWalletConnectEthCkEthDeposit({ ...params, principal: undefined })).toThrow(
					WalletConnectEthCkEthDepositError
				);
			});

			it.each([
				{ kind: 'a deposit followed by more bytes', data: `${ownDeposit}00` },
				{ kind: 'a truncated deposit', data: ownDeposit.slice(0, -2) },
				{ kind: 'a deposit naming no principal', data: `${CKETH_DEPOSIT_HASH}${'00'.repeat(32)}` },
				// `getMinterAddress()`
				{ kind: 'another function of the helper', data: '0x93e5d42a' },
				{ kind: 'calldata too short to carry a selector', data: '0xab' }
			])('should throw for $kind', ({ data }) => {
				expect(() => getWalletConnectEthCkEthDeposit({ ...params, data })).toThrow(
					WalletConnectEthCkEthDepositError
				);
			});

			it.each([undefined, '', '0x'])(
				'should return undefined for a request to the helper carrying no calldata (%s)',
				(data) => {
					expect(getWalletConnectEthCkEthDeposit({ ...params, data })).toBeUndefined();
				}
			);

			it('should return undefined for a deposit to another contract', () => {
				expect(
					getWalletConnectEthCkEthDeposit({
						...params,
						to: SPENDER,
						data: encodeDeposit(OTHER_PRINCIPAL)
					})
				).toBeUndefined();
			});

			describe('while the helper contract is not confirmed', () => {
				const unconfirmed = [
					{ state: 'not loaded', minterInfo: undefined },
					{ state: 'not loadable', minterInfo: null },
					{ state: 'not certified', minterInfo: { ...minterInfo, certified: false } }
				];

				it.each(unconfirmed)(
					'should hold a deposit to another principal while the minter information is $state',
					({ minterInfo }) => {
						expect(() =>
							getWalletConnectEthCkEthDeposit({
								...params,
								minterInfo,
								data: encodeDeposit(OTHER_PRINCIPAL)
							})
						).toThrow(WalletConnectEthCkEthHelperUnconfirmedError);
					}
				);

				it.each(unconfirmed)(
					'should hold a deposit to the principal of the user while the minter information is $state',
					({ minterInfo }) => {
						expect(() => getWalletConnectEthCkEthDeposit({ ...params, minterInfo })).toThrow(
							WalletConnectEthCkEthHelperUnconfirmedError
						);
					}
				);

				// Without the helper's address, a contract that is not the helper cannot be told apart from
				// one that is.
				it('should hold a deposit addressed to any contract', () => {
					expect(() =>
						getWalletConnectEthCkEthDeposit({
							...params,
							to: SPENDER,
							minterInfo: undefined,
							data: encodeDeposit(OTHER_PRINCIPAL)
						})
					).toThrow(WalletConnectEthCkEthHelperUnconfirmedError);
				});

				it('should hold a deposit on Sepolia as well', () => {
					expect(() =>
						getWalletConnectEthCkEthDeposit({
							...params,
							networkId: SEPOLIA_NETWORK_ID,
							minterInfo: undefined
						})
					).toThrow(WalletConnectEthCkEthHelperUnconfirmedError);
				});

				it('should hold a deposit whatever the case of its selector', () => {
					expect(() =>
						getWalletConnectEthCkEthDeposit({
							...params,
							minterInfo: undefined,
							data: `0x${ownDeposit.slice(2).toUpperCase()}`
						})
					).toThrow(WalletConnectEthCkEthHelperUnconfirmedError);
				});

				it('should not hold calldata that is not a deposit', () => {
					expect(
						getWalletConnectEthCkEthDeposit({
							...params,
							minterInfo: undefined,
							data: `${ERC20_TRANSFER_HASH}${'de'.repeat(64)}`
						})
					).toBeUndefined();
				});

				it.each([undefined, '0x'])(
					'should not hold a request carrying no calldata (%s)',
					(data) => {
						expect(
							getWalletConnectEthCkEthDeposit({ ...params, minterInfo: undefined, data })
						).toBeUndefined();
					}
				);

				it('should not hold a deposit on an EVM network without ckETH', () => {
					expect(
						getWalletConnectEthCkEthDeposit({
							...params,
							networkId: BASE_NETWORK_ID,
							minterInfo: undefined,
							data: encodeDeposit(OTHER_PRINCIPAL)
						})
					).toBeUndefined();
				});
			});
		});

		describe('classifyWalletConnectEthSendTransaction', () => {
			it('should classify a deposit to the principal of the user as a ckETH deposit', () => {
				const call = classifyWalletConnectEthSendTransaction(params);

				expect(call.type).toBe('ckEthDeposit');
				expect(call.type === 'ckEthDeposit' && call.principal.toText()).toBe(
					mockPrincipal.toText()
				);
			});

			it('should refuse a deposit to another principal', () => {
				expect(
					classifyWalletConnectEthSendTransaction({
						...params,
						data: encodeDeposit(OTHER_PRINCIPAL)
					})
				).toEqual({ type: 'ckEthDepositRefused' });
			});

			it('should refuse calldata to the helper that is not a deposit', () => {
				expect(
					classifyWalletConnectEthSendTransaction({ ...params, data: `${ERC20_TRANSFER_HASH}00` })
				).toEqual({ type: 'ckEthDepositRefused' });
			});

			it('should classify a request to the helper carrying no calldata as native', () => {
				expect(classifyWalletConnectEthSendTransaction({ ...params, data: '0x' })).toEqual({
					type: 'native'
				});
			});

			it('should classify a request to another contract by its calldata alone', () => {
				expect(
					classifyWalletConnectEthSendTransaction({
						...params,
						to: SPENDER,
						data: encodeDeposit(OTHER_PRINCIPAL)
					})
				).toEqual({ type: 'unknown', selector: CKETH_DEPOSIT_HASH });

				expect(
					classifyWalletConnectEthSendTransaction({
						...params,
						to: SPENDER,
						data: `${ERC20_TRANSFER_HASH}${'de'.repeat(64)}`
					})
				).toEqual({ type: 'erc20Transfer' });
			});

			it('should hold a deposit while the helper contract is not confirmed', () => {
				expect(
					classifyWalletConnectEthSendTransaction({ ...params, minterInfo: undefined })
				).toEqual({ type: 'ckEthHelperUnconfirmed' });
			});

			it('should classify a deposit on an EVM network without ckETH by its calldata alone', () => {
				expect(
					classifyWalletConnectEthSendTransaction({ ...params, networkId: BASE_NETWORK_ID })
				).toEqual({ type: 'unknown', selector: CKETH_DEPOSIT_HASH });
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
			{ type: 'unknown' as const, selector: '0xdeadbeef' },
			{ type: 'ckEthDeposit' as const, principal: mockPrincipal },
			{ type: 'ckEthDepositRefused' as const },
			{ type: 'ckEthHelperUnconfirmed' as const }
		])('should not treat $type as an approval', (call) => {
			expect(isWalletConnectEthApproval(call)).toBeFalsy();
		});
	});

	describe('isWalletConnectEthTokenCallWithValue', () => {
		const tokenCalls = [
			{ type: 'erc20Transfer' as const },
			{ type: 'erc20Approve' as const },
			{ type: 'erc20AllowanceDelta' as const, increase: true },
			{ type: 'erc20AllowanceDelta' as const, increase: false }
		];

		it.each(tokenCalls)('should flag $type carrying native value', (call) => {
			expect(isWalletConnectEthTokenCallWithValue({ call, value: 1n })).toBeTruthy();
		});

		it.each(tokenCalls)('should not flag $type carrying no native value', (call) => {
			expect(isWalletConnectEthTokenCallWithValue({ call, value: ZERO })).toBeFalsy();
		});

		// Their review states the native value itself, so it has a line for it.
		it.each([
			{ type: 'native' as const },
			{ type: 'setApprovalForAll' as const },
			{ type: 'unknown' as const, selector: '0xdeadbeef' }
		])('should not flag $type carrying native value', (call) => {
			expect(isWalletConnectEthTokenCallWithValue({ call, value: 1n })).toBeFalsy();
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

		it('should name the struct an ERC-3009 authorization hashes', () => {
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

		// Depth is what the review indents by, so a struct two levels down must not be rendered as a
		// member of the root.
		it('should nest each struct beneath the one that declares it', () => {
			expect(
				getEthTypedDataMethods({
					domain: {},
					types: {
						EIP712Domain: EIP712_DOMAIN,
						Order: [{ name: 'offer', type: 'Offer' }],
						Offer: [{ name: 'items', type: 'Item[]' }],
						Item: [{ name: 'token', type: 'address' }]
					},
					primaryType: 'Order',
					message: {}
				})
			).toEqual([
				{ name: 'Order', depth: 0 },
				{ name: 'Offer', depth: 1 },
				{ name: 'Item', depth: 2 }
			]);
		});

		// A declaration the root never reaches is not covered by the signature, so it must not be
		// named. `getPrimaryType` rejects such a payload outright, which is why nothing is listed.
		it('should name nothing for a payload declaring a struct the root does not reach', () => {
			expect(
				getEthTypedDataMethods({
					domain: {},
					types: {
						EIP712Domain: EIP712_DOMAIN,
						Permit: [{ name: 'holder', type: 'address' }],
						Unreferenced: [{ name: 'x', type: 'string' }]
					},
					primaryType: 'Permit',
					message: {}
				})
			).toEqual([]);
		});

		it('should list a struct declared by two members once', () => {
			expect(
				getEthTypedDataMethods({
					domain: {},
					types: {
						EIP712Domain: EIP712_DOMAIN,
						Trade: [
							{ name: 'sold', type: 'Asset' },
							{ name: 'bought', type: 'Asset' }
						],
						Asset: [{ name: 'token', type: 'address' }]
					},
					primaryType: 'Trade',
					message: {}
				})
			).toEqual([
				{ name: 'Trade', depth: 0 },
				{ name: 'Asset', depth: 1 }
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

	describe('getEthTypedDataPrimaryType', () => {
		it('names the struct the digest is rooted at', () => {
			expect(getEthTypedDataPrimaryType(permit2)).toBe('PermitSingle');
		});

		// The declared field is the request's label for itself: the digest is the same whatever it says,
		// so naming the request after it would let an allowance pass for anything.
		it('names the hashed struct rather than the one the payload declares', () => {
			const mislabelled = { ...permit2, primaryType: 'Login' };

			expect(getEthTypedDataPrimaryType(mislabelled)).toBe('PermitSingle');

			expect(
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(mislabelled),
					sessionChainId: MAINNET_SESSION
				})
			).toBe(
				getSignParamsMessageTypedDataV4Hash({
					params: toParams(permit2),
					sessionChainId: MAINNET_SESSION
				})
			);
		});

		it('names nothing for a type graph with no single root', () => {
			expect(
				getEthTypedDataPrimaryType({
					types: {
						EIP712Domain: EIP712_DOMAIN,
						Login: [{ name: 'user', type: 'address' }],
						Order: [{ name: 'price', type: 'uint256' }]
					}
				})
			).toBeUndefined();
		});

		it('names nothing for a payload that declares no types', () => {
			expect(getEthTypedDataPrimaryType(JSON.parse('{}'))).toBeUndefined();
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
			{ name: 'Permit2 PermitBatch', typedData: permit2Batch },
			{ name: 'ERC-2612 Permit', typedData: erc2612Permit },
			{ name: 'DAI Permit', typedData: daiPermit(true) },
			{ name: 'ERC-3009 TransferWithAuthorization', typedData: transferWithAuthorization() },
			{ name: 'ERC-3009 ReceiveWithAuthorization', typedData: receiveWithAuthorization },
			{ name: 'Permit2 PermitTransferFrom', typedData: permit2Transfer },
			{ name: 'Permit2 PermitBatchTransferFrom', typedData: permit2BatchTransfer }
		])('should not warn about a recognised $name', ({ typedData }) => {
			expect(call(typedData)).toBeFalsy();
		});

		// The summary states the transfer, and the witness the signature also covers is the dApp's
		// own struct, which nothing describes.
		it.each([
			{ name: 'Permit2 PermitWitnessTransferFrom', typedData: permit2WitnessTransfer },
			{ name: 'Permit2 PermitBatchWitnessTransferFrom', typedData: permit2BatchWitnessTransfer }
		])('should warn about a $name', ({ typedData }) => {
			expect(call(typedData)).toBeTruthy();
		});

		// Signable, but as the wrapper: the transfer it carries is not the struct being hashed.
		it('should warn about a struct that wraps a Permit2 witness transfer', () => {
			const typedData = structuredClone(permit2WitnessTransfer);
			typedData.types.Wrapper = [{ name: 'transfer', type: 'PermitWitnessTransferFrom' }];
			typedData.message.transfer = permit2WitnessTransfer.message;

			expect(call(typedData)).toBeTruthy();
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

	describe('digest coverage of the typed-data domain', () => {
		// The domain does not follow the rule the message does. `TypedDataEncoder.hash` discards
		// `types.EIP712Domain` and separates the signature with whichever members the domain object
		// carries, so a member is covered because it is populated, not because it is declared. This
		// is why the review states the domain as it stands rather than filtering it by declaration.
		it('changes when a member the schema does not declare is added', () => {
			expect(
				ethersHash({
					...permit2,
					domain: { ...permit2.domain, salt: `0x${'ab'.repeat(32)}` }
				})
			).not.toBe(ethersHash(permit2));
		});

		it('is unchanged by dropping a declaration the domain still populates', () => {
			expect(
				ethersHash({
					...permit2,
					types: { ...permit2.types, EIP712Domain: [{ name: 'chainId', type: 'uint256' }] }
				})
			).toBe(ethersHash(permit2));
		});

		it.each([{ verifyingContract: ATTACKER }, { name: 'Not Permit2' }])(
			'changes when the domain member %s changes',
			(mutation) => {
				expect(ethersHash({ ...permit2, domain: { ...permit2.domain, ...mutation } })).not.toBe(
					ethersHash(permit2)
				);
			}
		);
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

	// The transfer schemas are matched member for member, so each fixture summarized below is held
	// to what its contract hashes: Circle's FiatToken for ERC-3009, Uniswap's `PermitHash` for Permit2.
	describe('type strings of the summarized transfer schemas', () => {
		const encodeType = ({ types, primaryType }: WalletConnectEthSignTypedDataV4): string => {
			const { EIP712Domain: _EIP712Domain, ...rest } = types;
			return TypedDataEncoder.from(rest).encodeType(primaryType);
		};

		it.each([
			{
				name: 'TransferWithAuthorization',
				typedData: transferWithAuthorization(),
				typeHash: '0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267'
			},
			{
				name: 'ReceiveWithAuthorization',
				typedData: receiveWithAuthorization,
				typeHash: '0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8'
			}
		])('hashes $name under the type hash the token checks', ({ typedData, typeHash }) => {
			expect(getEthTypedDataApproval(typedData)).toBeDefined();
			expect(id(encodeType(typedData))).toBe(typeHash);
		});

		it.each([
			{
				name: 'PermitTransferFrom',
				typedData: permit2Transfer,
				typeString:
					'PermitTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)'
			},
			{
				name: 'PermitBatchTransferFrom',
				typedData: permit2BatchTransfer,
				typeString:
					'PermitBatchTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline)TokenPermissions(address token,uint256 amount)'
			}
		])('hashes $name under the type string Permit2 checks', ({ typedData, typeString }) => {
			expect(getEthTypedDataApproval(typedData)).toBeDefined();
			expect(encodeType(typedData)).toBe(typeString);
		});

		// Permit2 hashes its own stub followed by the witness type string the spender passes it.
		it.each([
			{
				name: 'PermitWitnessTransferFrom',
				typedData: permit2WitnessTransfer,
				stub: 'PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,'
			},
			{
				name: 'PermitBatchWitnessTransferFrom',
				typedData: permit2BatchWitnessTransfer,
				stub: 'PermitBatchWitnessTransferFrom(TokenPermissions[] permitted,address spender,uint256 nonce,uint256 deadline,'
			}
		])('hashes $name under the stub Permit2 appends the witness to', ({ typedData, stub }) => {
			expect(getEthTypedDataApproval(typedData)).toBeDefined();
			expect(encodeType(typedData)).toBe(
				`${stub}Order witness)Order(OrderInfo info,uint256 outputAmount)OrderInfo(address swapper,uint256 deadline)TokenPermissions(address token,uint256 amount)`
			);
		});
	});

	describe('getEthTypedDataApproval', () => {
		it('summarizes a Permit2 request from its declared members', () => {
			expect(getEthTypedDataApproval(permit2)).toEqual({
				spender: SPENDER,
				allowances: [{ token: DAI, amount: 123456789n, unlimited: false, expiration: 1761743754 }]
			});
		});

		// Permit2 saturates at its declared uint160, not at the 256-bit maximum.
		it('calls a saturated Permit2 allowance unlimited', () => {
			const typedData = structuredClone(permit2);
			(typedData.message.details as Record<string, unknown>).amount = MAX_UINT_160.toString();

			expect(getEthTypedDataApproval(typedData)?.allowances[0].unlimited).toBeTruthy();
		});

		it('summarizes every allowance of a Permit2 batch, in order, for its one spender', () => {
			expect(getEthTypedDataApproval(permit2Batch)).toEqual({
				spender: SPENDER,
				allowances: [
					{ token: DAI, amount: 123456789n, unlimited: false, expiration: 1761743754 },
					{ token: USDC, amount: MAX_UINT_160, unlimited: true, expiration: 1761743755 }
				]
			});
		});

		it('summarizes a Permit2 batch that lists no token as no allowance', () => {
			const typedData = structuredClone(permit2Batch);
			typedData.message.details = [];

			expect(getEthTypedDataApproval(typedData)).toEqual({ spender: SPENDER, allowances: [] });
		});

		it('summarizes nothing when one entry of a Permit2 batch carries a non-conforming value', () => {
			const typedData = structuredClone(permit2Batch);
			(typedData.message.details as Record<string, unknown>[])[1].token = 'not-an-address';

			expect(getEthTypedDataApproval(typedData)).toBeUndefined();
		});

		// The batch is matched on its declared list, so a struct calling itself `PermitBatch` around a
		// single entry is no Permit2 schema at all.
		it('summarizes nothing for a batch struct whose details are not a list', () => {
			const typedData = structuredClone(permit2Batch);
			typedData.types.PermitBatch[0] = { name: 'details', type: 'PermitDetails' };
			[typedData.message.details] = typedData.message.details as Record<string, unknown>[];

			expect(getEthTypedDataApproval(typedData)).toBeUndefined();
		});

		it('summarizes an ERC-2612 permit from its value, deadline and verifying contract', () => {
			expect(getEthTypedDataApproval(erc2612Permit)).toEqual({
				spender: SPENDER,
				allowances: [
					{
						// ERC-2612 names no token: the contract that verifies the permit is the token.
						token: DAI,
						amount: 1000000n,
						unlimited: false,
						expiration: 1893456000
					}
				]
			});
		});

		// The report this fixes: an unlimited permit summarized as a bare spender.
		it('calls a saturated ERC-2612 value unlimited', () => {
			const typedData = structuredClone(erc2612Permit);
			typedData.message.value = MAX_UINT_256.toString();

			expect(getEthTypedDataApproval(typedData)).toEqual({
				spender: SPENDER,
				allowances: [{ token: DAI, amount: MAX_UINT_256, unlimited: true, expiration: 1893456000 }]
			});
		});

		// "Never expires" is written as a saturated uint256, which is not a moment in time.
		it('states no expiration for a deadline no date can hold', () => {
			const typedData = structuredClone(erc2612Permit);
			typedData.message.deadline = MAX_UINT_256.toString();

			expect(getEthTypedDataApproval(typedData)?.allowances).toEqual([
				expect.objectContaining({ expiration: undefined })
			]);
		});

		// A saturated `uint48` is a safe integer, and still past the last second a `Date` holds.
		it('states no expiration for a Permit2 expiration at the uint48 maximum', () => {
			const maxUint48 = ((1n << 48n) - 1n).toString();

			const single = structuredClone(permit2);
			(single.message.details as Record<string, unknown>).expiration = maxUint48;

			const batch = structuredClone(permit2Batch);
			(batch.message.details as Record<string, unknown>[])[1].expiration = maxUint48;

			expect(getEthTypedDataApproval(single)?.allowances[0].expiration).toBeUndefined();
			expect(
				getEthTypedDataApproval(batch)?.allowances.map(({ expiration }) => expiration)
			).toEqual([1761743754, undefined]);
		});

		it('states an expiration up to the last second a date can hold', () => {
			const typedData = structuredClone(erc2612Permit);

			typedData.message.deadline = '8640000000000';

			expect(getEthTypedDataApproval(typedData)?.allowances[0].expiration).toBe(8_640_000_000_000);

			typedData.message.deadline = '8640000000001';

			expect(getEthTypedDataApproval(typedData)?.allowances[0].expiration).toBeUndefined();
		});

		// DAI carries no amount: `allowed` is the allowance, and it is an unlimited one.
		it('summarizes an allowed DAI permit as unlimited', () => {
			expect(getEthTypedDataApproval(daiPermit(true))).toEqual({
				spender: SPENDER,
				allowances: [{ token: DAI, amount: undefined, unlimited: true, expiration: 1893456000 }]
			});
		});

		it('summarizes a cleared DAI permit as a revocation', () => {
			expect(getEthTypedDataApproval(daiPermit(false))).toEqual({
				spender: SPENDER,
				allowances: [{ token: DAI, amount: ZERO, unlimited: false, expiration: 1893456000 }]
			});
		});

		describe('ERC-3009 authorizations', () => {
			const erc3009Approval = {
				recipient: RECIPIENT,
				allowances: [
					{
						// Like ERC-2612, ERC-3009 names no token: the contract that verifies it is the token.
						token: USDC,
						amount: 5000000000n,
						expiration: 1893456000
					}
				]
			};

			it('summarizes a transfer from its value, recipient, deadline and verifying contract', () => {
				expect(getEthTypedDataApproval(transferWithAuthorization())).toEqual(erc3009Approval);
			});

			it('summarizes a receive like the transfer it authorizes', () => {
				expect(getEthTypedDataApproval(receiveWithAuthorization)).toEqual(erc3009Approval);
			});

			it('summarizes the declared members only, whatever undeclared keys ride along', () => {
				expect(getEthTypedDataApproval(transferWithAuthorization(UNDECLARED_SUMMARY_KEYS))).toEqual(
					erc3009Approval
				);
			});

			// A transfer moves its value or nothing, so its largest figure is still that figure.
			it('does not call a saturated value unlimited', () => {
				expect(
					getEthTypedDataApproval(transferWithAuthorization({ value: MAX_UINT_256.toString() }))
				).toEqual({
					...erc3009Approval,
					allowances: [{ token: USDC, amount: MAX_UINT_256, expiration: 1893456000 }]
				});
			});

			it('summarizes nothing for a struct of that name with another member', () => {
				const typedData = transferWithAuthorization();
				typedData.types.TransferWithAuthorization = [
					...typedData.types.TransferWithAuthorization,
					{ name: 'memo', type: 'string' }
				];
				typedData.message.memo = 'gm';

				expect(getEthTypedDataApproval(typedData)).toBeUndefined();
			});
		});

		describe('Permit2 signature transfers', () => {
			it('summarizes a transfer from its permitted token and amount, spender and deadline', () => {
				expect(getEthTypedDataApproval(permit2Transfer)).toEqual({
					spender: SPENDER,
					allowances: [
						{ token: USDC, amount: 250000000n, unlimited: false, expiration: 1893456000 }
					]
				});
			});

			it('summarizes every transfer of a batch, in order, under its one deadline', () => {
				expect(getEthTypedDataApproval(permit2BatchTransfer)).toEqual({
					spender: SPENDER,
					allowances: [
						{ token: USDC, amount: 250000000n, unlimited: false, expiration: 1893456000 },
						{ token: DAI, amount: MAX_UINT_256, unlimited: true, expiration: 1893456000 }
					]
				});
			});

			// The amount is a uint256, so it saturates where ERC-2612 does, not where Permit2's allowances do.
			it('does not call a transfer of the Permit2 allowance maximum unlimited', () => {
				const typedData = structuredClone(permit2Transfer);
				(typedData.message.permitted as Record<string, unknown>).amount = MAX_UINT_160.toString();

				expect(getEthTypedDataApproval(typedData)?.allowances).toEqual([
					{ token: USDC, amount: MAX_UINT_160, unlimited: false, expiration: 1893456000 }
				]);
			});

			it('summarizes nothing when one entry of a batch carries a non-conforming value', () => {
				const typedData = structuredClone(permit2BatchTransfer);
				(typedData.message.permitted as Record<string, unknown>[])[1].amount = '-1';

				expect(getEthTypedDataApproval(typedData)).toBeUndefined();
			});

			it.each([
				{
					name: 'PermitWitnessTransferFrom',
					typedData: permit2WitnessTransfer,
					transfer: permit2Transfer
				},
				{
					name: 'PermitBatchWitnessTransferFrom',
					typedData: permit2BatchWitnessTransfer,
					transfer: permit2BatchTransfer
				}
			])('summarizes the transfer of a $name and flags its witness', ({ typedData, transfer }) => {
				expect(getEthTypedDataApproval(typedData)).toEqual({
					...getEthTypedDataApproval(transfer),
					hasWitness: true
				});
			});

			// The witness is the dApp's to type, and Permit2 hashes a bare value as readily as a struct.
			it('flags a witness that is not a struct', () => {
				const typedData = structuredClone(permit2WitnessTransfer);
				typedData.types = {
					EIP712Domain: typedData.types.EIP712Domain,
					PermitWitnessTransferFrom: [
						...permit2Transfer.types.PermitTransferFrom,
						{ name: 'witness', type: 'bytes32' }
					],
					TokenPermissions: PERMIT2_TOKEN_PERMISSIONS
				};
				typedData.message.witness = `0x${'cd'.repeat(32)}`;

				expect(getEthTypedDataApproval(typedData)?.hasWitness).toBeTruthy();
			});

			it('summarizes nothing for a witness transfer that declares no witness', () => {
				const typedData: WalletConnectEthSignTypedDataV4 = {
					...permit2Transfer,
					types: {
						EIP712Domain: permit2Transfer.types.EIP712Domain,
						PermitWitnessTransferFrom: permit2Transfer.types.PermitTransferFrom,
						TokenPermissions: PERMIT2_TOKEN_PERMISSIONS
					},
					primaryType: 'PermitWitnessTransferFrom'
				};

				expect(getEthTypedDataApproval(typedData)).toBeUndefined();
			});

			it('summarizes nothing for a witness transfer that declares a member past its witness', () => {
				const typedData = structuredClone(permit2WitnessTransfer);
				typedData.types.PermitWitnessTransferFrom.push({ name: 'memo', type: 'string' });
				typedData.message.memo = 'gm';

				expect(getEthTypedDataApproval(typedData)).toBeUndefined();
			});

			it('summarizes nothing for a witness transfer whose TokenPermissions is not the one Permit2 declares', () => {
				const typedData = structuredClone(permit2WitnessTransfer);
				typedData.types.TokenPermissions = [
					{ name: 'token', type: 'address' },
					{ name: 'amount', type: 'uint160' }
				];

				expect(getEthTypedDataApproval(typedData)).toBeUndefined();
			});

			// Accepting structs the schema does not list must not let one of them become the root, since
			// the root is what is hashed: here the transfer at the top is no member of the signed struct.
			it('summarizes nothing for a struct that wraps a witness transfer', () => {
				const typedData = structuredClone(permit2WitnessTransfer);
				typedData.types.Wrapper = [{ name: 'transfer', type: 'PermitWitnessTransferFrom' }];
				typedData.message.transfer = { ...permit2WitnessTransfer.message, spender: RECIPIENT };

				expect(getEthTypedDataApproval(typedData)).toBeUndefined();
			});
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
