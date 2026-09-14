import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { SEPOLIA_USDC_TOKEN, USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ERC_SET_APPROVAL_FOR_ALL_HASH } from '$eth/constants/erc.constants';
import {
	ERC20_APPROVE_HASH,
	ERC20_DECREASE_ALLOWANCE_HASH,
	ERC20_INCREASE_ALLOWANCE_HASH,
	ERC20_TRANSFER_HASH
} from '$eth/constants/erc20.constants';
import {
	MULTICALL_DEADLINE_HASH,
	MULTICALL_HASH,
	MULTICALL_MAX_METHODS
} from '$eth/constants/multicall.constants';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { ErcTransfer } from '$eth/types/eth-transaction';
import {
	decodeErc20AbiData,
	decodeErc20AbiDataValue,
	decodeErc20TransferRecipient,
	decodeSetApprovalForAllData,
	findErcTransfer,
	findErcTransfers,
	formatErcTransferAsset,
	getCalldataMethods,
	getCalldataSelector,
	groupEthTransactionsByNetworkAndHash,
	hasCalldata,
	isErc20TransactionApprove,
	isErc20TransactionDecreaseAllowance,
	isErc20TransactionDeposit,
	isErc20TransactionIncreaseAllowance,
	isErc20TransactionTransfer,
	isErcTransactionSetApprovalForAll,
	isMaxUint256,
	mapAddressToName,
	mapEthTransactionUi,
	tryDecodeErc20AbiData
} from '$eth/utils/transactions.utils';
import { toCkMinterBuiltInContacts } from '$icp-eth/utils/ck-minter-contacts.utils';
import { MAX_UINT_256, ZERO } from '$lib/constants/app.constants';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkId } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import type { Transaction } from '$lib/types/transaction';
import { formatToken } from '$lib/utils/format.utils';
import { getTokenDisplayName, getTokenDisplaySymbol } from '$lib/utils/token.utils';
import {
	mockCkEthereumMinterAddress,
	mockCkMinterInfo,
	mockErc20HelperContractAddress,
	mockEthHelperContractAddress
} from '$tests/mocks/ck-minter.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';
import { AbiCoder } from 'ethers/abi';

const transaction: Transaction = {
	blockNumber: 123456,
	from: '0x1234',
	to: '0xabcd',
	timestamp: 1670000000,
	nonce: 1,
	gasLimit: ZERO,
	value: ZERO,
	chainId: 1n,
	data: '0x'
};

const ckMinterInfoAddresses: EthAddress[] = ['0xffff'];

const ethAddress: OptionEthAddress = '0xffff';

// transfer(0x1234567890AbcdEF1234567890aBcdef12345678, 10000000)
const transferRecipient = '0x1234567890AbcdEF1234567890aBcdef12345678';

const transferData = `${ERC20_TRANSFER_HASH}0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000000000000989680`;

describe('transactions.utils', () => {
	describe('mapAddressToName', () => {
		const mockAddress: EthAddress = mockEthAddress;
		const mockNetworkId: NetworkId = ETHEREUM_NETWORK_ID;
		const mockErc20Tokens: Erc20Token[] = [USDC_TOKEN, SEPOLIA_USDC_TOKEN, PEPE_TOKEN];
		const mockMinterInfo: CertifiedData<CkEthMinterDid.MinterInfo> = {
			data: mockCkMinterInfo,
			certified: false
		};

		const mockBuiltInContacts: ContactUi[] = toCkMinterBuiltInContacts({
			minterInfo: mockMinterInfo
		});

		const mockParams = {
			address: mockAddress,
			networkId: mockNetworkId,
			erc20Tokens: mockErc20Tokens,
			builtInContacts: mockBuiltInContacts
		};

		it('should return undefined if the address is nullish', () => {
			expect(mapAddressToName({ ...mockParams, address: undefined })).toBeUndefined();

			expect(mapAddressToName({ ...mockParams, address: null })).toBeUndefined();
		});

		it('should return undefined if it does not match any known ERC20 token nor any CK Helper contracts', () => {
			expect(mapAddressToName(mockParams)).toBeUndefined();
		});

		it('should return the token name if the address matches a known ERC20 token', () => {
			expect(mapAddressToName({ ...mockParams, address: PEPE_TOKEN.address })).toBe(
				PEPE_TOKEN.name
			);

			expect(
				mapAddressToName({
					...mockParams,
					address: SEPOLIA_USDC_TOKEN.address,
					networkId: SEPOLIA_NETWORK_ID
				})
			).toBe(SEPOLIA_USDC_TOKEN.name);
		});

		it('should return undefined if the network does not match', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: PEPE_TOKEN.address,
					networkId: SEPOLIA_NETWORK_ID
				})
			).toBeUndefined();
		});

		it('should return undefined if the ERC20 token is not found', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: PEPE_TOKEN.address,
					erc20Tokens: [USDC_TOKEN, SEPOLIA_USDC_TOKEN]
				})
			).toBeUndefined();

			expect(
				mapAddressToName({
					...mockParams,
					address: SEPOLIA_USDC_TOKEN.address,
					networkId: SEPOLIA_NETWORK_ID,
					erc20Tokens: [USDC_TOKEN, PEPE_TOKEN]
				})
			).toBeUndefined();
		});

		it('should return undefined if the ERC20 token list is empty', () => {
			expect(
				mapAddressToName({ ...mockParams, address: PEPE_TOKEN.address, erc20Tokens: [] })
			).toBeUndefined();
		});

		it('should return the ckETH Helper Contract name if the address matches the ckETH Helper Contract', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: mockEthHelperContractAddress
				})
			).toBe('ckETH Minter Helper Contract');
		});

		it('should return the ckERC20 Helper Contract name if the address matches the ckERC20 Helper Contract', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: mockErc20HelperContractAddress
				})
			).toBe('ckERC20 Minter Helper Contract');
		});

		it('should return the CK Minter name if the address matches the CK Minter', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: mockCkEthereumMinterAddress
				})
			).toBe('CK Ethereum Minter');
		});

		it('should return undefined if no built-in contacts are provided', () => {
			expect(
				mapAddressToName({
					...mockParams,
					address: mockEthHelperContractAddress,
					builtInContacts: []
				})
			).toBeUndefined();

			expect(
				mapAddressToName({
					...mockParams,
					address: mockErc20HelperContractAddress,
					builtInContacts: undefined
				})
			).toBeUndefined();
		});
	});

	describe('mapEthTransactionUi', () => {
		it('should map to "withdraw" when the "from" address is in ckMinterInfoAddresses', () => {
			const ckMinterInfoAddresses: EthAddress[] = ['0x1234'];

			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.type).toBe('withdraw');
		});

		it('should map to "deposit" when the "to" address is in ckMinterInfoAddresses', () => {
			const ckMinterInfoAddresses: EthAddress[] = ['0xabcd'];

			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.type).toBe('deposit');
		});

		it('should map to "send" when the "from" address matches the ethAddress', () => {
			const result = mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				ethAddress: '0x1234'
			});

			expect(result.type).toBe('send');
		});

		it('should map to "receive" when none of the other conditions match', () => {
			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.type).toBe('receive');
		});

		it('should map to "receive" when it does not match MinterInfoAddresses and ethAddress is undefined', () => {
			const result = mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				ethAddress: undefined
			});

			expect(result.type).toBe('receive');
		});

		it('should not map to "withdraw" or to "deposit" when the MinterInfoAddresses are empty', () => {
			const ckMinterInfoAddresses: EthAddress[] = [];

			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.type).not.toBe('withdraw');
			expect(result.type).not.toBe('deposit');
		});

		it('should map an ID to the transaction hash if it exists', () => {
			const result = mapEthTransactionUi({
				transaction: { ...transaction, hash: '0x1234' },
				ckMinterInfoAddresses,
				ethAddress
			});

			expect(result.id).toBe('0x1234');
		});

		it('should map an ID to empty string if the transaction hash does not exist', () => {
			const result = mapEthTransactionUi({ transaction, ckMinterInfoAddresses, ethAddress });

			expect(result.id).toBe('');
		});

		it('should map to "approve" when the transaction data starts with the ERC20 approve hash', () => {
			const approveData = `${ERC20_APPROVE_HASH}000000000000000000000000abcdef1234567890abcdef1234567890abcdef12ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`;

			const result = mapEthTransactionUi({
				transaction: { ...transaction, data: approveData },
				ckMinterInfoAddresses,
				ethAddress
			});

			expect(result.type).toBe('approve');
			expect(result.approveSpender?.toLowerCase()).toBe(
				'0xabcdef1234567890abcdef1234567890abcdef12'
			);
		});

		it('should map a transaction whose approve calldata does not decode', () => {
			// Anyone can send a transaction to the wallet carrying a known selector and garbage.
			const result = mapEthTransactionUi({
				transaction: { ...transaction, data: `${ERC20_APPROVE_HASH}00` },
				ckMinterInfoAddresses,
				ethAddress
			});

			expect(result.type).toBe('approve');
			expect(result.approveSpender).toBeUndefined();
		});

		it('should prioritize approve over other types when data starts with ERC20 approve hash', () => {
			const approveData = `${ERC20_APPROVE_HASH}000000000000000000000000abcdef1234567890abcdef1234567890abcdef12ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`;

			const result = mapEthTransactionUi({
				transaction: { ...transaction, from: '0x1234', data: approveData },
				ckMinterInfoAddresses: ['0x1234'],
				ethAddress
			});

			expect(result.type).toBe('approve');
		});

		it('should map the decoded recipient of an ERC20 transfer', () => {
			const result = mapEthTransactionUi({
				transaction: { ...transaction, data: transferData },
				ckMinterInfoAddresses,
				ethAddress
			});

			expect(result.transferRecipient).toBe(transferRecipient);
		});

		it('should not map a recipient for a transaction that is not an ERC20 transfer', () => {
			const result = mapEthTransactionUi({
				transaction,
				ckMinterInfoAddresses,
				ethAddress
			});

			expect(result.transferRecipient).toBeUndefined();
		});
	});

	describe('decodeErc20TransferRecipient', () => {
		it('should decode the recipient of an ERC20 transfer', () => {
			expect(decodeErc20TransferRecipient(transferData)).toBe(transferRecipient);
		});

		it('should return undefined for data that is not an ERC20 transfer', () => {
			expect(decodeErc20TransferRecipient(`${ERC20_APPROVE_HASH}0000`)).toBeUndefined();

			expect(decodeErc20TransferRecipient(undefined)).toBeUndefined();
		});

		it('should return undefined instead of throwing for truncated transfer data', () => {
			expect(decodeErc20TransferRecipient(`${ERC20_TRANSFER_HASH}00`)).toBeUndefined();
		});
	});

	describe('groupEthTransactionsByNetworkAndHash', () => {
		const items = [
			{ networkId: ETHEREUM_NETWORK_ID, hash: '0xaaa' },
			{ networkId: ETHEREUM_NETWORK_ID, hash: '0xaaa' },
			{ networkId: ETHEREUM_NETWORK_ID, hash: '0xbbb' },
			{ networkId: SEPOLIA_NETWORK_ID, hash: '0xaaa' },
			{ networkId: ETHEREUM_NETWORK_ID, hash: undefined }
		];

		const groups = groupEthTransactionsByNetworkAndHash({
			items,
			networkId: ({ networkId }) => networkId,
			hash: ({ hash }) => hash
		});

		it('should group by network and hash', () => {
			expect(groups.get(ETHEREUM_NETWORK_ID)?.get('0xaaa')).toStrictEqual([items[0], items[1]]);

			expect(groups.get(ETHEREUM_NETWORK_ID)?.get('0xbbb')).toStrictEqual([items[2]]);
		});

		it('should not mix up the same hash on different networks', () => {
			expect(groups.get(SEPOLIA_NETWORK_ID)?.get('0xaaa')).toStrictEqual([items[3]]);
		});

		it('should skip items without a hash', () => {
			expect([...(groups.get(ETHEREUM_NETWORK_ID)?.values() ?? [])].flat()).not.toContain(items[4]);
		});
	});

	describe('formatErcTransferAsset', () => {
		it('should format the amount and symbol of a fungible transfer', () => {
			expect(formatErcTransferAsset({ token: USDC_TOKEN, value: 10000000n })).toBe(
				`${formatToken({
					value: 10000000n,
					displayDecimals: USDC_TOKEN.decimals,
					unitName: USDC_TOKEN.decimals
				})} ${getTokenDisplaySymbol(USDC_TOKEN)}`
			);
		});

		it('should return undefined for a fungible transfer without a value', () => {
			expect(formatErcTransferAsset({ token: USDC_TOKEN, value: undefined })).toBeUndefined();
		});

		it('should describe a non-fungible transfer by collection and token id', () => {
			expect(formatErcTransferAsset({ token: mockValidErc721Token, value: 1n, tokenId: 123 })).toBe(
				`${getTokenDisplayName(mockValidErc721Token)} #123`
			);
		});

		it('should not format the value of a non-fungible transfer as an amount', () => {
			expect(
				formatErcTransferAsset({ token: mockValidErc721Token, value: 1n, tokenId: 123 })
			).not.toContain(mockValidErc721Token.symbol);
		});

		it('should fall back to the collection alone without a token id', () => {
			expect(formatErcTransferAsset({ token: mockValidErc721Token, value: 1n })).toBe(
				getTokenDisplayName(mockValidErc721Token)
			);
		});
	});

	describe('findErcTransfer', () => {
		const transfer: ErcTransfer = {
			transaction: { ...transaction, hash: '0xaaa' },
			token: USDC_TOKEN
		};

		const transfers = new Map([
			[
				ETHEREUM_NETWORK_ID,
				new Map([
					['0xaaa', [transfer]],
					// A swap emits a transfer per leg under the same hash.
					['0xbbb', [transfer, transfer]]
				])
			]
		]);

		it('should find the unique transfer of a hash', () => {
			expect(
				findErcTransfer({ hash: '0xaaa', networkId: ETHEREUM_NETWORK_ID, transfers })
			).toStrictEqual(transfer);
		});

		it('should return undefined when several transfers share the hash', () => {
			expect(
				findErcTransfer({ hash: '0xbbb', networkId: ETHEREUM_NETWORK_ID, transfers })
			).toBeUndefined();
		});

		it('should return every transfer of a hash', () => {
			expect(
				findErcTransfers({ hash: '0xbbb', networkId: ETHEREUM_NETWORK_ID, transfers })
			).toStrictEqual([transfer, transfer]);

			expect(
				findErcTransfers({ hash: '0xaaa', networkId: ETHEREUM_NETWORK_ID, transfers })
			).toStrictEqual([transfer]);
		});

		it('should return no transfers for an unknown hash, network or nullish hash', () => {
			expect(
				findErcTransfers({ hash: '0xccc', networkId: ETHEREUM_NETWORK_ID, transfers })
			).toStrictEqual([]);

			expect(
				findErcTransfers({ hash: '0xaaa', networkId: SEPOLIA_NETWORK_ID, transfers })
			).toStrictEqual([]);

			expect(
				findErcTransfers({ hash: undefined, networkId: ETHEREUM_NETWORK_ID, transfers })
			).toStrictEqual([]);
		});

		it('should return undefined for an unknown hash, network or nullish hash', () => {
			expect(
				findErcTransfer({ hash: '0xccc', networkId: ETHEREUM_NETWORK_ID, transfers })
			).toBeUndefined();

			expect(
				findErcTransfer({ hash: '0xaaa', networkId: SEPOLIA_NETWORK_ID, transfers })
			).toBeUndefined();

			expect(
				findErcTransfer({ hash: undefined, networkId: ETHEREUM_NETWORK_ID, transfers })
			).toBeUndefined();
		});
	});

	describe('isErc20TransactionTransfer', () => {
		it('should return true for calldata starting with the transfer selector', () => {
			expect(isErc20TransactionTransfer(`${ERC20_TRANSFER_HASH}deadbeef`)).toBeTruthy();
		});

		it('should return false for calldata of another ERC20 method', () => {
			expect(isErc20TransactionTransfer(`${ERC20_APPROVE_HASH}deadbeef`)).toBeFalsy();
		});

		it('should return false for nullish calldata', () => {
			expect(isErc20TransactionTransfer(undefined)).toBeFalsy();
		});
	});

	describe('isErc20TransactionIncreaseAllowance', () => {
		it('should detect the increaseAllowance selector', () => {
			expect(
				isErc20TransactionIncreaseAllowance(`${ERC20_INCREASE_ALLOWANCE_HASH}deadbeef`)
			).toBeTruthy();
		});

		it('should not detect another allowance selector', () => {
			expect(isErc20TransactionIncreaseAllowance(`${ERC20_APPROVE_HASH}deadbeef`)).toBeFalsy();
			expect(
				isErc20TransactionIncreaseAllowance(`${ERC20_DECREASE_ALLOWANCE_HASH}deadbeef`)
			).toBeFalsy();
		});

		it('should not detect undefined data', () => {
			expect(isErc20TransactionIncreaseAllowance(undefined)).toBeFalsy();
		});
	});

	describe('isErc20TransactionDecreaseAllowance', () => {
		it('should detect the decreaseAllowance selector', () => {
			expect(
				isErc20TransactionDecreaseAllowance(`${ERC20_DECREASE_ALLOWANCE_HASH}deadbeef`)
			).toBeTruthy();
		});

		it('should not detect the increaseAllowance selector', () => {
			expect(
				isErc20TransactionDecreaseAllowance(`${ERC20_INCREASE_ALLOWANCE_HASH}deadbeef`)
			).toBeFalsy();
		});

		it('should not detect undefined data', () => {
			expect(isErc20TransactionDecreaseAllowance(undefined)).toBeFalsy();
		});
	});

	describe('hasCalldata', () => {
		it.each([undefined, '', '0x', '0X'])('should read %s as carrying no call', (data) => {
			expect(hasCalldata(data)).toBeFalsy();
		});

		// Four bytes of nothing is still a call, and reviewing it as a plain transfer is exactly the
		// misstatement the unknown state exists to prevent.
		it.each(['0xab', '0xdeadbeef', `${ERC20_APPROVE_HASH}deadbeef`])(
			'should read %s as carrying a call',
			(data) => {
				expect(hasCalldata(data)).toBeTruthy();
			}
		);
	});

	describe('getCalldataMethods', () => {
		const SPENDER = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
		const PERMIT2_APPROVE_HASH = '0x87517c45';
		const UNIVERSAL_ROUTER_EXECUTE_HASH = '0x3593564c';

		const encode = ({ selector, value }: { selector: string; value: bigint }) =>
			`${selector}${AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SPENDER, value]).slice(2)}`;

		const encodeMulticall = ({
			selector = MULTICALL_HASH,
			calls
		}: {
			selector?: string;
			calls: string[];
		}) =>
			`${selector}${AbiCoder.defaultAbiCoder()
				.encode(
					selector === MULTICALL_DEADLINE_HASH ? ['uint256', 'bytes[]'] : ['bytes[]'],
					selector === MULTICALL_DEADLINE_HASH ? [1n, calls] : [calls]
				)
				.slice(2)}`;

		it.each([undefined, '', '0x'])('should list nothing for %s', (data) => {
			expect(getCalldataMethods(data)).toEqual({ methods: [], capped: false });
		});

		it('should list a plain call as itself', () => {
			expect(getCalldataMethods(encode({ selector: ERC20_APPROVE_HASH, value: 1n }))).toEqual({
				methods: [{ selector: ERC20_APPROVE_HASH, depth: 0 }],
				capped: false
			});
		});

		it('should list calldata too short to name a function, without a selector', () => {
			expect(getCalldataMethods('0xab')).toEqual({
				methods: [{ selector: undefined, depth: 0 }],
				capped: false
			});
		});

		it('should list the wrapper and the calls batched inside it', () => {
			const data = encodeMulticall({
				calls: [
					encode({ selector: ERC20_APPROVE_HASH, value: 1n }),
					encode({ selector: PERMIT2_APPROVE_HASH, value: 2n })
				]
			});

			expect(getCalldataMethods(data)).toEqual({
				methods: [
					{ selector: MULTICALL_HASH, depth: 0 },
					{ selector: ERC20_APPROVE_HASH, depth: 1 },
					{ selector: PERMIT2_APPROVE_HASH, depth: 1 }
				],
				capped: false
			});
		});

		it('should read the batch out of the deadline variant, past its first argument', () => {
			const data = encodeMulticall({
				selector: MULTICALL_DEADLINE_HASH,
				calls: [encode({ selector: ERC20_APPROVE_HASH, value: 1n })]
			});

			expect(getCalldataMethods(data)).toEqual({
				methods: [
					{ selector: MULTICALL_DEADLINE_HASH, depth: 0 },
					{ selector: ERC20_APPROVE_HASH, depth: 1 }
				],
				capped: false
			});
		});

		it('should stop descending at the depth limit rather than walk a tree of the caller choosing', () => {
			const data = encodeMulticall({
				calls: [
					encodeMulticall({
						calls: [
							encodeMulticall({ calls: [encode({ selector: ERC20_APPROVE_HASH, value: 1n })] })
						]
					})
				]
			});

			expect(getCalldataMethods(data).methods.map(({ depth }) => depth)).toEqual([0, 1, 2]);
		});

		it('should cap the list rather than render a batch of any length', () => {
			const calls = Array.from({ length: MULTICALL_MAX_METHODS + 10 }, () =>
				encode({ selector: ERC20_APPROVE_HASH, value: 1n })
			);

			const { methods, capped } = getCalldataMethods(encodeMulticall({ calls }));

			expect(methods).toHaveLength(MULTICALL_MAX_METHODS);
			expect(capped).toBeTruthy();
		});

		// A batch that ends exactly on the cap left nothing out. Reporting it as truncated would put
		// a "some calls are not listed" note on a list that is complete.
		it('should not report a batch that ends exactly on the cap as capped', () => {
			// The wrapper occupies one of the entries, so the batch that exactly fills the cap is one
			// call shorter than it.
			const calls = Array.from({ length: MULTICALL_MAX_METHODS - 1 }, () =>
				encode({ selector: ERC20_APPROVE_HASH, value: 1n })
			);

			const { methods, capped } = getCalldataMethods(encodeMulticall({ calls }));

			expect(methods).toHaveLength(MULTICALL_MAX_METHODS);
			expect(capped).toBeFalsy();
		});

		// A wrapper whose arguments do not decode has yielded nothing, and saying so is the point:
		// listing it alone is honest, inventing its contents would not be.
		it('should list a wrapper whose arguments do not decode as itself', () => {
			expect(getCalldataMethods(`${MULTICALL_HASH}deadbeef`)).toEqual({
				methods: [{ selector: MULTICALL_HASH, depth: 0 }],
				capped: false
			});
		});

		// A Universal Router `execute` carries opcodes and bare arguments, not calldata. There are
		// no selectors in it to find, and none are claimed.
		it('should not claim to read a wrapper it cannot open', () => {
			const data = `${UNIVERSAL_ROUTER_EXECUTE_HASH}${AbiCoder.defaultAbiCoder()
				.encode(['bytes', 'bytes[]', 'uint256'], ['0x0a00', ['0xdeadbeef'], 1n])
				.slice(2)}`;

			expect(getCalldataMethods(data)).toEqual({
				methods: [{ selector: UNIVERSAL_ROUTER_EXECUTE_HASH, depth: 0 }],
				capped: false
			});
		});
	});

	describe('getCalldataSelector', () => {
		it('should return the selector lowercased', () => {
			expect(getCalldataSelector(`${ERC20_INCREASE_ALLOWANCE_HASH.toUpperCase()}deadbeef`)).toBe(
				ERC20_INCREASE_ALLOWANCE_HASH
			);
		});

		it.each([undefined, '0x', '0xab', '0x3950935'])('should return no selector for %s', (data) => {
			expect(getCalldataSelector(data)).toBeUndefined();
		});
	});

	describe('isErcTransactionSetApprovalForAll', () => {
		it('should return true for calldata starting with the setApprovalForAll selector', () => {
			expect(
				isErcTransactionSetApprovalForAll(`${ERC_SET_APPROVAL_FOR_ALL_HASH}deadbeef`)
			).toBeTruthy();
		});

		it('should return false for calldata of an ERC20 method', () => {
			expect(isErcTransactionSetApprovalForAll(`${ERC20_APPROVE_HASH}deadbeef`)).toBeFalsy();

			expect(isErcTransactionSetApprovalForAll(`${ERC20_TRANSFER_HASH}deadbeef`)).toBeFalsy();
		});

		it('should return false for nullish calldata', () => {
			expect(isErcTransactionSetApprovalForAll(undefined)).toBeFalsy();
		});
	});

	describe('decodeSetApprovalForAllData', () => {
		const operator = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

		const encode = (approved: boolean): string =>
			`${ERC_SET_APPROVAL_FOR_ALL_HASH}${AbiCoder.defaultAbiCoder()
				.encode(['address', 'bool'], [operator, approved])
				.slice(2)}`;

		it('should decode the operator and a granted approval', () => {
			expect(decodeSetApprovalForAllData(encode(true))).toStrictEqual({
				operator,
				approved: true
			});
		});

		it('should decode the operator and a revoked approval', () => {
			expect(decodeSetApprovalForAllData(encode(false))).toStrictEqual({
				operator,
				approved: false
			});
		});

		it('should throw on truncated calldata rather than inventing an operator', () => {
			expect(() => decodeSetApprovalForAllData(`${ERC_SET_APPROVAL_FOR_ALL_HASH}00`)).toThrow();
		});
	});

	// Casing is not part of calldata: the EVM sees the same four bytes either way, so a classifier
	// that reads the text can be stepped around without changing the call that executes. That let a
	// token transfer reach the review as a native zero-value send, with the fail-closed warning
	// silent because the calldata was never recognised as ERC-20 in the first place.
	describe('ERC20 selectors are matched as bytes, not as text', () => {
		const args =
			'000000000000000000000000ca11bde05977b3631167028862be2a173976ca110000000000000000000000000000000000000000000000000de0b6b3a7640000';

		it.each(['0xA9059CBB', '0xa9059CBB', '0xA9059cbb'])(
			'should recognise %s as a transfer',
			(selector) => {
				expect(isErc20TransactionTransfer(`${selector}${args}`)).toBeTruthy();
			}
		);

		it.each(['0x095EA7B3', '0x095eA7B3'])('should recognise %s as an approve', (selector) => {
			expect(isErc20TransactionApprove(`${selector}${args}`)).toBeTruthy();
		});

		it.each(['0x26B3293F', '0xDB9751AF'])('should recognise %s as a deposit', (selector) => {
			expect(isErc20TransactionDeposit(`${selector}${args}`)).toBeTruthy();
		});

		it.each(['0xA22CB465', '0xa22CB465', '0xA22cb465'])(
			'should recognise %s as a setApprovalForAll',
			(selector) => {
				expect(isErcTransactionSetApprovalForAll(`${selector}${args}`)).toBeTruthy();
			}
		);

		// The selector is four bytes and no more: a longer prefix that merely starts the same way is
		// a different call.
		it('should not mistake one selector for another that shares a prefix', () => {
			expect(isErc20TransactionTransfer(`${ERC20_APPROVE_HASH}${args}`)).toBeFalsy();
			expect(isErc20TransactionApprove(`${ERC20_TRANSFER_HASH}${args}`)).toBeFalsy();
		});

		it('should return false for calldata too short to carry a selector', () => {
			expect(isErc20TransactionTransfer('0xa905')).toBeFalsy();
			expect(isErc20TransactionApprove('0x')).toBeFalsy();
		});
	});

	describe('tryDecodeErc20AbiData', () => {
		const txData =
			'0x26b3293f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000';

		it('should decode well-formed calldata like decodeErc20AbiData', () => {
			expect(tryDecodeErc20AbiData({ data: txData })).toStrictEqual(
				decodeErc20AbiData({ data: txData })
			);
		});

		it('should return undefined values instead of throwing on truncated calldata', () => {
			expect(() => decodeErc20AbiData({ data: `${ERC20_APPROVE_HASH}00` })).toThrow();

			expect(tryDecodeErc20AbiData({ data: `${ERC20_APPROVE_HASH}00` })).toStrictEqual({
				to: undefined,
				value: undefined
			});
		});
	});

	describe('decodeErc20AbiData', () => {
		const txData =
			'0x26b3293f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000';
		const result = { to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', value: 1000000n };

		it('should decode ERC20 ABI data correctly if bytesParam is false', () => {
			expect(
				decodeErc20AbiData({
					data: txData
				})
			).toStrictEqual(result);
		});

		it('should decode ERC20 ABI data correctly if bytesParam is true', () => {
			expect(
				decodeErc20AbiData({
					data: txData,
					bytesParam: true
				})
			).toStrictEqual(result);
		});
	});

	describe('decodeErc20AbiDataValue', () => {
		const txData =
			'0x26b3293f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42401db5f0b9209d75b4b358ddd228eb7097ccec7b8f65e0acef29e51271ce020000';
		const result = 1000000n;

		it('should decode ERC20 ABI data value correctly if bytesParam is false', () => {
			expect(
				decodeErc20AbiDataValue({
					data: txData
				})
			).toBe(result);
		});

		it('should decode ERC20 ABI data value correctly if bytesParam is true', () => {
			expect(
				decodeErc20AbiDataValue({
					data: txData,
					bytesParam: true
				})
			).toBe(result);
		});
	});

	describe('isMaxUint256', () => {
		it('should return true for the maximum uint256 value', () => {
			expect(isMaxUint256(MAX_UINT_256)).toBeTruthy();
		});

		it('should return false for a value that is not the maximum uint256', () => {
			expect(isMaxUint256(ZERO)).toBeFalsy();

			expect(isMaxUint256(123456n)).toBeFalsy();

			expect(isMaxUint256(MAX_UINT_256 - 1n)).toBeFalsy();
		});

		it('should return false for nullish values', () => {
			expect(isMaxUint256(null)).toBeFalsy();

			expect(isMaxUint256(undefined)).toBeFalsy();
		});
	});
});
