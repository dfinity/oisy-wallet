import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import EthWalletConnectSignModal from '$eth/components/wallet-connect/EthWalletConnectSignModal.svelte';
import {
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN
} from '$eth/constants/wallet-connect.constants';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { render } from '@testing-library/svelte';

describe('EthWalletConnectSignModal', () => {
	const typedData = {
		types: {
			EIP712Domain: [
				{ name: 'name', type: 'string' },
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
			chainId: '1',
			verifyingContract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
		},
		primaryType: 'Permit',
		message: {
			owner: '0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95',
			spender: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
			value: '1000000',
			nonce: '0',
			deadline: '1893456000'
		}
	};

	const mockRequest = ({
		method,
		payload
	}: {
		method: string;
		payload: string;
	}): WalletKitTypes.SessionRequest =>
		({
			id: 1,
			topic: 'mock-topic',
			params: {
				request: { method, params: ['0xf2e508d5b8f44f08bd81c7d19e9f1f5277e31f95', payload] },
				chainId: `eip155:${ETHEREUM_NETWORK.chainId}`
			},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					validation: 'VALID',
					origin: 'https://app.uniswap.org',
					isScam: false
				}
			}
		}) as unknown as WalletKitTypes.SessionRequest;

	const props = (request: WalletKitTypes.SessionRequest) => ({ listener: undefined, request });

	it('should title a typed-data request by the struct it hashes', () => {
		const { getByText } = render(EthWalletConnectSignModal, {
			props: props(
				mockRequest({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					payload: JSON.stringify(typedData)
				})
			)
		});

		expect(
			getByText(
				replacePlaceholders(en.wallet_connect.text.sign_transaction_with_type, { $type: 'Permit' })
			)
		).toBeInTheDocument();
	});

	it('should state the name its own domain supplies in the summary, never in the title', () => {
		// The domain name is the request's text. In the wallet's chrome it reads as a name OISY
		// vouched for, which is why it belongs in the summary beside the contract it claims to be.
		const { getAllByText, getByTestId } = render(EthWalletConnectSignModal, {
			props: props(
				mockRequest({
					method: SESSION_REQUEST_ETH_SIGN_V4,
					payload: JSON.stringify(typedData)
				})
			)
		});

		expect(getAllByText('USD Coin')).toEqual([getByTestId('wallet-connect-domain-name')]);
	});

	it('should fall back to the plain transaction title when the payload names no struct', () => {
		// A payload that does not parse still arrived as a typed-data method, and it is titled as the
		// transaction it is. Reporting that it cannot be read is the review's job, not the title's.
		const { getByText } = render(EthWalletConnectSignModal, {
			props: props(mockRequest({ method: SESSION_REQUEST_ETH_SIGN_V4, payload: 'not json at all' }))
		});

		expect(getByText(en.wallet_connect.text.sign_transaction)).toBeInTheDocument();
	});

	it('should title a raw-message request as a message', () => {
		const { getByText, queryByText } = render(EthWalletConnectSignModal, {
			props: props(mockRequest({ method: SESSION_REQUEST_PERSONAL_SIGN, payload: '0x48656c6c6f' }))
		});

		expect(getByText(en.wallet_connect.text.sign_message)).toBeInTheDocument();

		expect(queryByText(en.wallet_connect.text.sign_transaction)).not.toBeInTheDocument();
	});
});
