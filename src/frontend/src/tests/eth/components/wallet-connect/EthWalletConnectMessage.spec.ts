import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import EthWalletConnectMessage from '$eth/components/wallet-connect/EthWalletConnectMessage.svelte';
import {
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN
} from '$eth/constants/wallet-connect.constants';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import * as walletConnectUtils from '$eth/utils/wallet-connect.utils';
import {
	getSignParamsMessageTypedDataV4,
	getSignParamsMessageUtf8
} from '$eth/utils/wallet-connect.utils';
import { MAX_UINT_256 } from '$lib/constants/app.constants';
import { Languages } from '$lib/enums/languages';
import { formatSecondsToDate, formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { fireEvent, render } from '@testing-library/svelte';

describe('EthWalletConnectMessage', () => {
	// The raw message lives on its own tab. Reaching it is a click, not a scroll.
	const openRawTab = async (getByRole: (role: string, options: { name: string }) => HTMLElement) =>
		await fireEvent.click(getByRole('button', { name: en.wallet_connect.text.tab_raw_data }));

	const request: WalletKitTypes.SessionRequest = {
		params: {
			request: {
				method: SESSION_REQUEST_ETH_SIGN_V4,
				params: [
					'0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
					'{' +
						'"types":' +
						'{' +
						'"PermitSingle":[{"name":"details","type":"PermitDetails"},{"name":"spender","type":"address"},{"name":"sigDeadline","type":"uint256"}],' +
						'"PermitDetails":[{"name":"token","type":"address"},{"name":"amount","type":"uint160"},{"name":"expiration","type":"uint48"},{"name":"nonce","type":"uint48"}],' +
						'"EIP712Domain":[{"name":"name","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}]' +
						'},' +
						'"domain":{"name":"Permit2","chainId":"1","verifyingContract":"0x000000000022d473030f116ddee9f6b43ac78ba3"},' +
						'"primaryType":"PermitSingle",' +
						'"message":' +
						'{' +
						'"details":' +
						'{' +
						'"token":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",' +
						'"amount":"123456789123456789123456789123456789123456789",' +
						'"expiration":"1761743754","nonce":"0"' +
						'},' +
						'"spender":"0x66a9893cc07d91d95644aedd05d03f95e1dba8af",' +
						'"sigDeadline":"1759153554"' +
						'}' +
						'}'
				]
			},
			chainId: ETHEREUM_NETWORK.chainId.toString()
		},
		verifyContext: {
			verified: {
				verifyUrl: 'https://verify.walletconnect.org',
				validation: 'VALID',
				origin: 'https://app.uniswap.org',
				isScam: false
			}
		}
	} as WalletKitTypes.SessionRequest;

	beforeEach(() => {
		// `clearAllMocks` forgets the calls but keeps the implementations, so the spy that makes the
		// parser throw survived into every test declared after it and left them parsing nothing.
		vi.restoreAllMocks();

		vi.spyOn(walletConnectUtils, 'getSignParamsMessageTypedDataV4');

		erc20DefaultTokensStore.reset();
		erc20CustomTokensStore.resetAll();

		erc20DefaultTokensStore.add(USDC_TOKEN);
		erc20CustomTokensStore.setAll([{ data: { ...USDC_TOKEN, enabled: true }, certified: false }]);
	});

	it('should render the JSON parsed message', async () => {
		const { getByText, getByRole, getByTestId } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(getSignParamsMessageTypedDataV4).toHaveBeenCalledExactlyOnceWith(
			request.params.request.params
		);

		await openRawTab(getByRole);

		expect(getByText(en.wallet_connect.text.message)).toBeInTheDocument();

		expect(getByTestId('json')).toBeInTheDocument();
	});

	it('should render the application', () => {
		const { getByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(getByText(en.wallet_connect.text.application)).toBeInTheDocument();

		expect(getByText('https://app.uniswap.org')).toBeInTheDocument();
	});

	it('should render the method', () => {
		const { getByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(getByText(en.wallet_connect.text.method)).toBeInTheDocument();

		expect(getByText(SESSION_REQUEST_ETH_SIGN_V4)).toBeInTheDocument();
	});

	it('should name the struct being signed, not just how the request arrived', () => {
		// The RPC method says a typed-data signature; only the primary type says it is an allowance.
		const { getByText } = render(EthWalletConnectMessage, { props: { request } });

		expect(getByText(en.wallet_connect.text.type)).toBeInTheDocument();

		expect(getByText('PermitSingle')).toBeInTheDocument();
	});

	it('should say nothing about a type for a request that is not typed data', () => {
		const { queryByText } = render(EthWalletConnectMessage, {
			props: {
				request: {
					...request,
					params: {
						...request.params,
						request: {
							method: 'personal_sign',
							params: ['0xdeadbeef', '0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95']
						}
					}
				} as WalletKitTypes.SessionRequest
			}
		});

		expect(queryByText(en.wallet_connect.text.type)).not.toBeInTheDocument();
	});

	it('should render the token if it is enabled', () => {
		const { getByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(getByText(en.wallet_connect.text.token)).toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.network)).toBeInTheDocument();

		expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();
		expect(getByText(USDC_TOKEN.network.name)).toBeInTheDocument();

		expect(getByText(en.wallet_connect.text.amount)).toBeInTheDocument();

		expect(
			getByText(
				`${formatToken({
					value: BigInt('123456789123456789123456789123456789123456789'),
					unitName: USDC_TOKEN.decimals,
					displayDecimals: USDC_TOKEN.decimals
				})} ${USDC_TOKEN.symbol}`
			)
		).toBeInTheDocument();
	});

	it('should render the spender', () => {
		const { getByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(getByText(en.wallet_connect.text.spender)).toBeInTheDocument();

		expect(getByText('0x66a9893cc07d91d95644aedd05d03f95e1dba8af')).toBeInTheDocument();
	});

	it('should render the expiration', () => {
		const { getByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		const expected = formatSecondsToDate({
			seconds: Number('1761743754'),
			language: Languages.ENGLISH
		});

		expect(getByText(en.wallet_connect.text.expiration)).toBeInTheDocument();

		expect(getByText(expected)).toBeInTheDocument();
	});

	it('should not summarize keys the signed schema does not declare', async () => {
		// ERC-3009 transfer authorization: `spender` and `details` are absent from
		// the declared type, so they are absent from the digest. Summarizing them
		// would describe an approval of 1 USDC while 5,000 USDC is being signed away.
		const newRequest: WalletKitTypes.SessionRequest = {
			...request,
			params: {
				request: {
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: [
						'0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
						JSON.stringify({
							types: {
								EIP712Domain: [
									{ name: 'name', type: 'string' },
									{ name: 'version', type: 'string' },
									{ name: 'chainId', type: 'uint256' },
									{ name: 'verifyingContract', type: 'address' }
								],
								TransferWithAuthorization: [
									{ name: 'from', type: 'address' },
									{ name: 'to', type: 'address' },
									{ name: 'value', type: 'uint256' },
									{ name: 'validAfter', type: 'uint256' },
									{ name: 'validBefore', type: 'uint256' },
									{ name: 'nonce', type: 'bytes32' }
								]
							},
							domain: {
								name: 'USD Coin',
								version: '2',
								chainId: '1',
								verifyingContract: USDC_TOKEN.address
							},
							primaryType: 'TransferWithAuthorization',
							message: {
								from: '0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
								to: '0x1111111111111111111111111111111111111111',
								value: '5000000000',
								validAfter: '0',
								validBefore: '1893456000',
								nonce: `0x${'ab'.repeat(32)}`,
								spender: '0x2222222222222222222222222222222222222222',
								details: {
									token: USDC_TOKEN.address,
									amount: '1000000',
									expiration: '1800000000'
								}
							}
						})
					]
				},
				chainId: ETHEREUM_NETWORK.chainId.toString()
			}
		} as WalletKitTypes.SessionRequest;

		const { getByText, getByRole, getByTestId, queryByText } = render(EthWalletConnectMessage, {
			props: {
				request: newRequest
			}
		});

		expect(queryByText(en.wallet_connect.text.token)).not.toBeInTheDocument();
		expect(queryByText(en.wallet_connect.text.network)).not.toBeInTheDocument();
		expect(queryByText(en.wallet_connect.text.amount)).not.toBeInTheDocument();
		expect(queryByText(en.wallet_connect.text.spender)).not.toBeInTheDocument();
		expect(queryByText(en.wallet_connect.text.expiration)).not.toBeInTheDocument();

		expect(queryByText(USDC_TOKEN.symbol)).not.toBeInTheDocument();
		expect(queryByText('0x2222222222222222222222222222222222222222')).not.toBeInTheDocument();

		// The full payload stays available in the raw message viewer, one tab over.
		await openRawTab(getByRole);

		expect(getByText(en.wallet_connect.text.message)).toBeInTheDocument();
		expect(getByTestId('json')).toBeInTheDocument();
	});

	// A token OISY does not list is still the contract the allowance is over, and the allowance is
	// still the point of the request. Neither may be dropped just because the symbol is unknown.
	it('should render the contract and the raw allowance when the token is not enabled', () => {
		erc20DefaultTokensStore.reset();
		erc20CustomTokensStore.resetAll();

		const { getByText, getByTestId, queryByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(getByText(en.wallet_connect.text.token)).toBeInTheDocument();
		expect(getByText('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toBeInTheDocument();

		// Nothing is claimed that is not known: no symbol, no network, and no scaled figure.
		expect(queryByText(en.wallet_connect.text.network)).not.toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.symbol)).not.toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.network.name)).not.toBeInTheDocument();

		expect(
			queryByText(
				`${formatToken({
					value: BigInt('123456789123456789123456789123456789123456789'),
					unitName: USDC_TOKEN.decimals,
					displayDecimals: USDC_TOKEN.decimals
				})} ${USDC_TOKEN.symbol}`
			)
		).not.toBeInTheDocument();

		expect(getByTestId('wallet-connect-typed-data-amount')).toHaveTextContent(
			`123456789123456789123456789123456789123456789 ${en.wallet_connect.text.token_units}`
		);
	});

	it('should handle an empty token in the message', () => {
		const newRequest: WalletKitTypes.SessionRequest = {
			...request,
			params: {
				request: {
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: [
						'0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
						'{' +
							'"types":' +
							'{' +
							'"PermitSingle":[{"name":"details","type":"PermitDetails"},{"name":"spender","type":"address"},{"name":"sigDeadline","type":"uint256"}],' +
							'"PermitDetails":[{"name":"token","type":"address"},{"name":"amount","type":"uint160"},{"name":"expiration","type":"uint48"},{"name":"nonce","type":"uint48"}],' +
							'"EIP712Domain":[{"name":"name","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}]' +
							'},' +
							'"domain":{"name":"Permit2","chainId":"1","verifyingContract":"0x000000000022d473030f116ddee9f6b43ac78ba3"},' +
							'"primaryType":"PermitSingle",' +
							'"message":' +
							'{' +
							'"details":' +
							'{' +
							'"token":"not-a-valid-address",' + // Changed here
							'"amount":"1461501637330902918203684832716283019655932542975",' +
							'"expiration":"1761743754","nonce":"0"' +
							'},' +
							'"spender":"0x66a9893cc07d91d95644aedd05d03f95e1dba8af",' +
							'"sigDeadline":"1759153554"' +
							'}' +
							'}'
					]
				},
				chainId: ETHEREUM_NETWORK.chainId.toString()
			}
		} as WalletKitTypes.SessionRequest;

		const { queryByText } = render(EthWalletConnectMessage, {
			props: {
				request: newRequest
			}
		});

		expect(queryByText(`${en.wallet_connect.text.token}:`)).not.toBeInTheDocument();
		expect(queryByText(`${en.wallet_connect.text.network}:`)).not.toBeInTheDocument();

		expect(queryByText(USDC_TOKEN.symbol)).not.toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.network.name)).not.toBeInTheDocument();
	});

	it('should handle errors when getting sign parameters', async () => {
		vi.spyOn(walletConnectUtils, 'getSignParamsMessageTypedDataV4').mockImplementation(() => {
			throw new Error('Test error');
		});

		const { getByText, getByRole, queryByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(getSignParamsMessageTypedDataV4).toHaveBeenCalledExactlyOnceWith(
			request.params.request.params
		);

		await openRawTab(getByRole);

		expect(getByText(en.wallet_connect.text.message)).toBeInTheDocument();

		expect(queryByText('{ ... }')).not.toBeInTheDocument();

		expect(getByText(getSignParamsMessageUtf8(request.params.request.params))).toBeInTheDocument();
	});

	it('should handle missing details in the message', () => {
		const newRequest: WalletKitTypes.SessionRequest = {
			...request,
			params: {
				request: {
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: [
						'0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
						'{' +
							'"types":' +
							'{' +
							'"PermitSingle":[{"name":"details","type":"PermitDetails"},{"name":"spender","type":"address"},{"name":"sigDeadline","type":"uint256"}],' +
							'"PermitDetails":[{"name":"token","type":"address"},{"name":"amount","type":"uint160"},{"name":"expiration","type":"uint48"},{"name":"nonce","type":"uint48"}],' +
							'"EIP712Domain":[{"name":"name","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}]' +
							'},' +
							'"domain":{"name":"Permit2","chainId":"1","verifyingContract":"0x000000000022d473030f116ddee9f6b43ac78ba3"},' +
							'"primaryType":"PermitSingle",' +
							'"message":' +
							'{' +
							'"details":' +
							'{' +
							'"amount":"1461501637330902918203684832716283019655932542975",' +
							'"expiration":"1761743754","nonce":"0"' +
							'},' +
							'"spender":"0x66a9893cc07d91d95644aedd05d03f95e1dba8af",' +
							'"sigDeadline":"1759153554"' +
							'}' +
							'}'
					]
				},
				chainId: ETHEREUM_NETWORK.chainId.toString()
			}
		} as WalletKitTypes.SessionRequest;

		const { queryByText } = render(EthWalletConnectMessage, {
			props: {
				request: newRequest
			}
		});

		expect(queryByText(`${en.wallet_connect.text.token}:`)).not.toBeInTheDocument();
		expect(queryByText(`${en.wallet_connect.text.network}:`)).not.toBeInTheDocument();

		expect(queryByText(USDC_TOKEN.symbol)).not.toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.network.name)).not.toBeInTheDocument();
	});

	it('should handle empty details in the message', () => {
		const newRequest: WalletKitTypes.SessionRequest = {
			...request,
			params: {
				request: {
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: [
						'0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
						'{' +
							'"types":' +
							'{' +
							'"PermitSingle":[{"name":"details","type":"PermitDetails"},{"name":"spender","type":"address"},{"name":"sigDeadline","type":"uint256"}],' +
							'"PermitDetails":[{"name":"token","type":"address"},{"name":"amount","type":"uint160"},{"name":"expiration","type":"uint48"},{"name":"nonce","type":"uint48"}],' +
							'"EIP712Domain":[{"name":"name","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}]' +
							'},' +
							'"domain":{"name":"Permit2","chainId":"1","verifyingContract":"0x000000000022d473030f116ddee9f6b43ac78ba3"},' +
							'"primaryType":"PermitSingle",' +
							'"message":' +
							'{' +
							'"spender":"0x66a9893cc07d91d95644aedd05d03f95e1dba8af",' +
							'"sigDeadline":"1759153554"' +
							'}' +
							'}'
					]
				},
				chainId: ETHEREUM_NETWORK.chainId.toString()
			}
		} as WalletKitTypes.SessionRequest;

		const { queryByText } = render(EthWalletConnectMessage, {
			props: {
				request: newRequest
			}
		});

		expect(queryByText(`${en.wallet_connect.text.token}:`)).not.toBeInTheDocument();
		expect(queryByText(`${en.wallet_connect.text.network}:`)).not.toBeInTheDocument();

		expect(queryByText(USDC_TOKEN.symbol)).not.toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.network.name)).not.toBeInTheDocument();
	});

	it('should not render the invalid typed-data warning by default', () => {
		const { queryByTestId } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(queryByTestId('wallet-connect-invalid-typed-data-warning')).not.toBeInTheDocument();
	});

	it('should render the invalid typed-data warning when invalidTypedData is true', () => {
		const { getByTestId, getByText } = render(EthWalletConnectMessage, {
			props: {
				request,
				invalidTypedData: true
			}
		});

		expect(getByTestId('wallet-connect-invalid-typed-data-warning')).toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.invalid_typed_data)).toBeInTheDocument();
	});

	it('should not state unsigned keys for a payload whose every key is declared', () => {
		const { queryByTestId } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(queryByTestId('wallet-connect-unsigned-typed-data-info')).not.toBeInTheDocument();
	});

	it('should state that a key the schema does not declare is not signed', () => {
		// Hyperliquid carries routing fields alongside the signed members of every action. They are
		// absent from the digest, so the preview drops them and says so rather than showing them as
		// if the signature covered them.
		const newRequest: WalletKitTypes.SessionRequest = {
			...request,
			params: {
				...request.params,
				request: {
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: [
						'0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
						JSON.stringify({
							domain: {
								name: 'HyperliquidSignTransaction',
								version: '1',
								chainId: 42161,
								verifyingContract: '0x0000000000000000000000000000000000000000'
							},
							types: {
								EIP712Domain: [
									{ name: 'name', type: 'string' },
									{ name: 'version', type: 'string' },
									{ name: 'chainId', type: 'uint256' },
									{ name: 'verifyingContract', type: 'address' }
								],
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
						})
					]
				}
			}
		} as WalletKitTypes.SessionRequest;

		const { getByTestId, getByText } = render(EthWalletConnectMessage, {
			props: {
				request: newRequest
			}
		});

		expect(getByTestId('wallet-connect-unsigned-typed-data-info')).toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.unsigned_typed_data_keys)).toBeInTheDocument();
	});

	it('should not state unsigned keys when the typed data is invalid', () => {
		// The warning already tells the user nothing here can be signed, so a second notice about
		// which part of it would not be would only muddy that.
		const { queryByTestId } = render(EthWalletConnectMessage, {
			props: {
				request,
				invalidTypedData: true
			}
		});

		expect(queryByTestId('wallet-connect-unsigned-typed-data-info')).not.toBeInTheDocument();
	});

	it('should render a typed-data payload sent through personal_sign as a raw message', async () => {
		// Such a request is signed as a plain message, so previewing it as a permit
		// would describe an authorization that is not the one being signed.
		const newRequest: WalletKitTypes.SessionRequest = {
			...request,
			params: {
				...request.params,
				request: {
					...request.params.request,
					method: SESSION_REQUEST_PERSONAL_SIGN
				}
			}
		} as WalletKitTypes.SessionRequest;

		const { getByText, getByRole, queryByText, queryByTestId } = render(EthWalletConnectMessage, {
			props: {
				request: newRequest
			}
		});

		expect(queryByText(`${en.wallet_connect.text.token}:`)).not.toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.symbol)).not.toBeInTheDocument();

		await openRawTab(getByRole);

		// Signed as a plain message, so it is shown as one rather than through the JSON viewer.
		expect(queryByTestId('json')).not.toBeInTheDocument();

		expect(
			getByText(getSignParamsMessageUtf8(newRequest.params.request.params))
		).toBeInTheDocument();
	});

	// The reported hole: an unlimited ERC-2612 permit rendered as a bare spender over a folded
	// message, with Approve live. The allowance must be named, and named as unlimited.
	describe('ERC-2612 permit', () => {
		const erc2612Request = ({
			value,
			chainId = '1'
		}: {
			value: string;
			chainId?: string | number;
		}): WalletKitTypes.SessionRequest =>
			({
				...request,
				params: {
					...request.params,
					request: {
						method: SESSION_REQUEST_ETH_SIGN_V4,
						params: [
							'0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
							JSON.stringify({
								types: {
									EIP712Domain: [
										{ name: 'name', type: 'string' },
										{ name: 'version', type: 'string' },
										{ name: 'chainId', type: 'uint256' },
										{ name: 'verifyingContract', type: 'address' }
									],
									Permit: [
										{ name: 'owner', type: 'address' },
										{ name: 'spender', type: 'address' },
										{ name: 'value', type: 'uint256' },
										{ name: 'nonce', type: 'uint256' },
										{ name: 'deadline', type: 'uint256' }
									]
								},
								domain: {
									name: 'USD Coin',
									version: '2',
									chainId,
									verifyingContract: USDC_TOKEN.address
								},
								primaryType: 'Permit',
								message: {
									owner: '0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
									spender: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
									value,
									nonce: '0',
									deadline: '1893456000'
								}
							})
						]
					}
				}
			}) as WalletKitTypes.SessionRequest;

		it('should name an unlimited allowance rather than print it', () => {
			const { getByTestId, getByText, queryByText } = render(EthWalletConnectMessage, {
				props: { request: erc2612Request({ value: MAX_UINT_256.toString() }) }
			});

			expect(getByText(en.wallet_connect.text.token)).toBeInTheDocument();
			expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();

			expect(getByTestId('wallet-connect-typed-data-amount')).toHaveTextContent(
				replacePlaceholders(en.core.text.unlimited, { $items: USDC_TOKEN.symbol }).trim()
			);

			// The figure it stands for must never be shown as an ordinary amount.
			expect(queryByText(MAX_UINT_256.toString())).not.toBeInTheDocument();

			expect(getByText(en.wallet_connect.text.expiration)).toBeInTheDocument();
		});

		it('should show a finite allowance scaled by the token decimals', () => {
			const { getByTestId } = render(EthWalletConnectMessage, {
				props: { request: erc2612Request({ value: '1000000' }) }
			});

			expect(getByTestId('wallet-connect-typed-data-amount')).toHaveTextContent(
				`${formatToken({
					value: 1000000n,
					unitName: USDC_TOKEN.decimals,
					displayDecimals: USDC_TOKEN.decimals
				})} ${USDC_TOKEN.symbol}`
			);
		});

		// A domain may state its chain in any uint256 form, and all of them hash the same.
		it.each([1, '1', '0x1', '01'])(
			'should resolve the token when the domain states its chain as %s',
			(chainId) => {
				const { getByText } = render(EthWalletConnectMessage, {
					props: { request: erc2612Request({ value: '1000000', chainId }) }
				});

				expect(getByText(USDC_TOKEN.symbol)).toBeInTheDocument();
			}
		);

		// A chain OISY cannot read leaves the token unresolved rather than resolved wrongly, and
		// the allowance is still stated.
		it('should still state the allowance when the domain chain is unreadable', () => {
			const { getByTestId, queryByText } = render(EthWalletConnectMessage, {
				props: { request: erc2612Request({ value: '1000000', chainId: 'mainnet' }) }
			});

			expect(queryByText(USDC_TOKEN.symbol)).not.toBeInTheDocument();
			expect(getByTestId('wallet-connect-typed-data-amount')).toHaveTextContent(
				`1000000 ${en.wallet_connect.text.token_units}`
			);
		});
	});
});
