import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { ICP_NETWORK, ICP_NETWORK_SYMBOL } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import {
	USDC_SYMBOL,
	USDC_TOKEN as USDC_TOKEN_ERC20
} from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDC_TOKEN as USDC_TOKEN_BEP20 } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdc.env';
import { USDC_TOKEN as USDC_TOKEN_SPL } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_SYMBOL, ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { extendedAddressContacts } from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import {
	generateAiAssistantResponseEventMetadata,
	parseReviewSendTokensToolArguments,
	parseShowBalanceToolArguments,
	parseShowFilteredContactsToolArguments,
	parseToAiAssistantContacts,
	parseToAiAssistantTokens
} from '$lib/utils/ai-assistant.utils';
import { mapToFrontendContact } from '$lib/utils/contact.utils';
import { getMockContacts } from '$tests/mocks/contacts.mock';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import { get } from 'svelte/store';

describe('ai-assistant.utils', () => {
	const contactsData = getMockContacts({
		n: 1,
		names: ['Alice'],
		addresses: [
			[{ label: ['Test'], token_account_id: { Eth: { Public: mockEthAddress } } }],
			[{ label: ['Test 2'], token_account_id: { Eth: { Public: mockEthAddress2 } } }]
		]
	}).map(mapToFrontendContact);

	contactsData.forEach((contact) => contactsStore.addContact(contact));

	const storeData = get(extendedAddressContacts);
	const extendedAddressContactUi = storeData[`${contactsData[0].id}`];
	const aiAssistantContact = {
		name: extendedAddressContactUi.name,
		addresses: [
			{
				addressType: extendedAddressContactUi.addresses[0].addressType,
				id: extendedAddressContactUi.addresses[0].id,
				label: extendedAddressContactUi.addresses[0].label,
				acceptedTokenStandards: ['ethereum', 'erc20', 'dip20']
			}
		]
	};

	describe('parseToAiAssistantContacts', () => {
		it('returns correct result', () => {
			expect(parseToAiAssistantContacts(storeData)).toEqual({
				[`${extendedAddressContactUi.id}`]: aiAssistantContact
			});
		});
	});

	describe('parseReviewSendTokenToolArguments', () => {
		const sendValue = 0.00001;
		const mockRandomUUID = 'd7775002-80bf-4208-a2f0-84225281677a';

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => mockRandomUUID);
		});

		it('returns correct result when selectedContactAddressId is provided', () => {
			expect(
				parseReviewSendTokensToolArguments({
					filterParams: [
						{
							value: extendedAddressContactUi.addresses[0].id,
							name: 'selectedContactAddressId'
						},
						{
							value: `${sendValue}`,
							name: 'amountNumber'
						},
						{
							value: 'ICP',
							name: 'tokenSymbol'
						},
						{
							value: 'ICP',
							name: 'networkId'
						}
					],
					tokens: [ICP_TOKEN, ETHEREUM_TOKEN, BTC_MAINNET_TOKEN],
					extendedAddressContacts: storeData
				})
			).toEqual({
				token: ICP_TOKEN,
				contactAddress: extendedAddressContactUi.addresses[0],
				contact: extendedAddressContactUi,
				amount: sendValue,
				address: undefined,
				id: mockRandomUUID,
				sendCompleted: false
			});
		});

		it('returns undefined when the token could not be identified', () => {
			expect(
				parseReviewSendTokensToolArguments({
					filterParams: [
						{
							value: extendedAddressContactUi.addresses[0].id,
							name: 'selectedContactAddressId'
						},
						{
							value: `${sendValue}`,
							name: 'amountNumber'
						},
						{
							value: 'RandomToken',
							name: 'tokenSymbol'
						},
						{
							value: 'RandomNetwork',
							name: 'networkId'
						}
					],
					tokens: [ICP_TOKEN, ETHEREUM_TOKEN, BTC_MAINNET_TOKEN],
					extendedAddressContacts: storeData
				})
			).toBeUndefined();
		});

		it('returns correct result when address is provided', () => {
			expect(
				parseReviewSendTokensToolArguments({
					filterParams: [
						{
							value: mockEthAddress,
							name: 'address'
						},
						{
							value: `${sendValue}`,
							name: 'amountNumber'
						},
						{
							value: 'ETH',
							name: 'tokenSymbol'
						},
						{
							value: 'ETH',
							name: 'networkId'
						}
					],
					tokens: [ICP_TOKEN, ETHEREUM_TOKEN, BTC_MAINNET_TOKEN],
					extendedAddressContacts: storeData
				})
			).toEqual({
				token: ETHEREUM_TOKEN,
				contactAddress: undefined,
				contact: undefined,
				amount: sendValue,
				address: mockEthAddress,
				id: mockRandomUUID,
				sendCompleted: false
			});
		});
	});

	describe('parseToAiAssistantTokens', () => {
		it('parses array of tokens correctly', () => {
			expect(
				parseToAiAssistantTokens([
					ICP_TOKEN,
					ETHEREUM_TOKEN,
					SOLANA_TOKEN,
					mockValidErc721Token,
					mockValidErc1155Token
				])
			).toEqual([
				{
					name: ICP_TOKEN.name,
					symbol: ICP_TOKEN.symbol,
					standard: ICP_TOKEN.standard,
					networkId: ICP_TOKEN.network.id.description ?? ''
				},
				{
					name: ETHEREUM_TOKEN.name,
					symbol: ETHEREUM_TOKEN.symbol,
					standard: ETHEREUM_TOKEN.standard,
					networkId: ETHEREUM_TOKEN.network.id.description ?? ''
				},
				{
					name: SOLANA_TOKEN.name,
					symbol: SOLANA_TOKEN.symbol,
					standard: SOLANA_TOKEN.standard,
					networkId: SOLANA_TOKEN.network.id.description ?? ''
				}
			]);
		});
	});

	describe('parseShowFilteredContactsToolArguments', () => {
		it('returns correct result when addressIds is provided', () => {
			expect(
				parseShowFilteredContactsToolArguments({
					filterParams: [
						{
							value: `["${extendedAddressContactUi.addresses[0].id}"]`,
							name: 'addressIds'
						}
					],
					extendedAddressContacts: storeData
				})
			).toEqual({
				contacts: [extendedAddressContactUi]
			});
		});

		it('returns empty result when addressIds cannot be matched with existing contacts', () => {
			expect(
				parseShowFilteredContactsToolArguments({
					filterParams: [
						{
							value: '["random-id"]',
							name: 'addressIds'
						}
					],
					extendedAddressContacts: storeData
				})
			).toEqual({
				contacts: []
			});
		});
	});

	describe('generateAiAssistantResponseEventMetadata', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('returns correct result with a tool name', () => {
			const additionalMetadata = { testParam: 'test' };
			const requestStartTimestamp = 1000000;
			vi.spyOn(Date, 'now').mockReturnValue(requestStartTimestamp + 4000000);

			expect(
				generateAiAssistantResponseEventMetadata({
					toolName: 'test',
					requestStartTimestamp,
					additionalMetadata
				})
			).toEqual({
				toolName: 'test',
				responseTime: '4000s',
				responseTimeCategory: '100000+',
				...additionalMetadata
			});
		});

		it('returns correct result without a tool name', () => {
			const requestStartTimestamp = 9000000;
			vi.spyOn(Date, 'now').mockReturnValue(requestStartTimestamp + 65579);

			expect(
				generateAiAssistantResponseEventMetadata({
					requestStartTimestamp
				})
			).toEqual({
				responseTime: '65.579s',
				responseTimeCategory: '20001-100000'
			});
		});
	});

	describe('parseShowBalanceToolArguments', () => {
		const icpTokenUi = { ...ICP_TOKEN, usdBalance: 1000, balance: 1000n };
		const usdcErc20TokenUi = { ...USDC_TOKEN_ERC20, usdBalance: 1000, balance: 1000n };
		const ckUsdcTokenUi = {
			...USDC_TOKEN_ERC20,
			symbol: 'ckUSDC',
			network: ICP_NETWORK,
			usdBalance: 1000,
			balance: 1000n
		};
		const usdcBep20TokenUi = { ...USDC_TOKEN_BEP20, usdBalance: 1000, balance: 1000n };
		const usdcSplTokenUi = { ...USDC_TOKEN_SPL, usdBalance: 1000, balance: 1000n };

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('returns correct result when both token symbol and network id provided', () => {
			expect(
				parseShowBalanceToolArguments({
					filterParams: [
						{
							value: ICP_SYMBOL,
							name: 'tokenSymbol'
						},
						{
							value: ICP_NETWORK_SYMBOL,
							name: 'networkId'
						}
					],
					tokensUi: [icpTokenUi, { ...ETHEREUM_TOKEN, usdBalance: 1000, balance: 1000n }],
					networks: [ICP_NETWORK, ETHEREUM_NETWORK]
				})
			).toEqual({
				mainCard: {
					token: icpTokenUi,
					totalUsdBalance: 1000
				}
			});
		});

		it('returns correct result when only token symbol provided', () => {
			expect(
				parseShowBalanceToolArguments({
					filterParams: [
						{
							value: USDC_SYMBOL,
							name: 'tokenSymbol'
						}
					],
					tokensUi: [usdcErc20TokenUi, usdcBep20TokenUi, usdcSplTokenUi, ckUsdcTokenUi],
					networks: [ETHEREUM_NETWORK, SOLANA_MAINNET_NETWORK, BSC_MAINNET_NETWORK]
				})
			).toEqual({
				mainCard: {
					token: usdcErc20TokenUi,
					totalUsdBalance:
						usdcErc20TokenUi.usdBalance +
						usdcBep20TokenUi.usdBalance +
						usdcSplTokenUi.usdBalance +
						ckUsdcTokenUi.usdBalance
				},
				secondaryCards: [usdcErc20TokenUi, usdcBep20TokenUi, usdcSplTokenUi, ckUsdcTokenUi]
			});
		});

		it('returns correct result when only network id provided', () => {
			expect(
				parseShowBalanceToolArguments({
					filterParams: [
						{
							value: ETHEREUM_NETWORK_SYMBOL,
							name: 'networkId'
						}
					],
					tokensUi: [usdcErc20TokenUi, usdcBep20TokenUi, usdcSplTokenUi],
					networks: [ETHEREUM_NETWORK, SOLANA_MAINNET_NETWORK, BSC_MAINNET_NETWORK]
				})
			).toEqual({
				mainCard: {
					network: ETHEREUM_NETWORK,
					totalUsdBalance: usdcErc20TokenUi.usdBalance
				},
				secondaryCards: [usdcErc20TokenUi]
			});
		});

		it('returns correct result when no filters provided', () => {
			expect(
				parseShowBalanceToolArguments({
					filterParams: [],
					tokensUi: [usdcErc20TokenUi, usdcBep20TokenUi, usdcSplTokenUi],
					networks: [ETHEREUM_NETWORK, SOLANA_MAINNET_NETWORK, BSC_MAINNET_NETWORK]
				})
			).toEqual({
				mainCard: {
					totalUsdBalance:
						usdcErc20TokenUi.usdBalance + usdcBep20TokenUi.usdBalance + usdcSplTokenUi.usdBalance
				}
			});
		});
	});
});
