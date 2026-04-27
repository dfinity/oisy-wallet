import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import EthWalletConnectMessage from '$eth/components/wallet-connect/EthWalletConnectMessage.svelte';
import { SESSION_REQUEST_ETH_SIGN_V4 } from '$eth/constants/wallet-connect.constants';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import * as walletConnectUtils from '$eth/utils/wallet-connect.utils';
import {
	getSignParamsMessageTypedDataV4,
	getSignParamsMessageUtf8
} from '$eth/utils/wallet-connect.utils';
import { Languages } from '$lib/enums/languages';
import { formatSecondsToDate, formatToken } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { render } from '@testing-library/svelte';

describe('EthWalletConnectMessage', () => {
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
		vi.clearAllMocks();

		vi.spyOn(walletConnectUtils, 'getSignParamsMessageTypedDataV4');

		erc20DefaultTokensStore.reset();
		erc20CustomTokensStore.resetAll();

		erc20DefaultTokensStore.add(USDC_TOKEN);
		erc20CustomTokensStore.setAll([{ data: { ...USDC_TOKEN, enabled: true }, certified: false }]);
	});

	it('should render the JSON parsed message', () => {
		const { getByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(getSignParamsMessageTypedDataV4).toHaveBeenCalledExactlyOnceWith(
			request.params.request.params
		);

		expect(getByText(en.wallet_connect.text.message)).toBeInTheDocument();

		expect(getByText('{ ... }')).toBeInTheDocument();
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

	it('should not render the token if it is not enabled', () => {
		erc20DefaultTokensStore.reset();
		erc20CustomTokensStore.resetAll();

		const { queryByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(queryByText(en.wallet_connect.text.token)).not.toBeInTheDocument();
		expect(queryByText(en.wallet_connect.text.network)).not.toBeInTheDocument();

		expect(queryByText(USDC_TOKEN.symbol)).not.toBeInTheDocument();
		expect(queryByText(USDC_TOKEN.network.name)).not.toBeInTheDocument();

		expect(queryByText(`${en.wallet_connect.text.amount}:`)).not.toBeInTheDocument();

		expect(
			queryByText(
				`${formatToken({
					value: BigInt('123456789123456789123456789123456789123456789'),
					unitName: USDC_TOKEN.decimals,
					displayDecimals: USDC_TOKEN.decimals
				})} ${USDC_TOKEN.symbol}`
			)
		).not.toBeInTheDocument();
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

	it('should handle errors when getting sign parameters', () => {
		vi.spyOn(walletConnectUtils, 'getSignParamsMessageTypedDataV4').mockImplementation(() => {
			throw new Error('Test error');
		});

		const { getByText, queryByText } = render(EthWalletConnectMessage, {
			props: {
				request
			}
		});

		expect(getSignParamsMessageTypedDataV4).toHaveBeenCalledExactlyOnceWith(
			request.params.request.params
		);

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
});
