import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import WalletConnectSignReview from '$eth/components/wallet-connect/WalletConnectSignReview.svelte';
import { SESSION_REQUEST_ETH_SIGN_V4 } from '$eth/constants/wallet-connect.constants';
import en from '$tests/mocks/i18n.mock';
import type { WalletKitTypes } from '@reown/walletkit';
import { render } from '@testing-library/svelte';

describe('WalletConnectSignReview', () => {
	const HOLDER = '0x96329840d29ab4ac4A324cA0B01F64EAE7aA7a6a';
	const SPENDER = '0xcA11bde05977b3631167028862bE2a173976CA11';
	const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';

	const daiPermitRequest = (allowed: unknown): WalletKitTypes.SessionRequest =>
		({
			id: 1,
			topic: 'mock-topic',
			params: {
				request: {
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: [
						HOLDER,
						JSON.stringify({
							domain: {
								name: 'Dai Stablecoin',
								version: '1',
								chainId: '1',
								verifyingContract: DAI
							},
							types: {
								EIP712Domain: [
									{ name: 'name', type: 'string' },
									{ name: 'version', type: 'string' },
									{ name: 'chainId', type: 'uint256' },
									{ name: 'verifyingContract', type: 'address' }
								],
								Permit: [
									{ name: 'holder', type: 'address' },
									{ name: 'spender', type: 'address' },
									{ name: 'nonce', type: 'uint256' },
									{ name: 'expiry', type: 'uint256' },
									{ name: 'allowed', type: 'bool' }
								]
							},
							primaryType: 'Permit',
							message: {
								holder: HOLDER,
								spender: SPENDER,
								nonce: '0',
								expiry: '1893456000',
								allowed
							}
						})
					]
				},
				// CAIP-2, as a WalletConnect envelope states it, and as the chain binding reads it.
				chainId: `eip155:${ETHEREUM_NETWORK.chainId}`
			},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					validation: 'VALID',
					origin: 'https://dapp.example',
					isScam: false
				}
			}
		}) as unknown as WalletKitTypes.SessionRequest;

	// Hyperliquid asks its actions to be signed with routing fields its schema does not declare.
	// They are absent from the digest, so the request signs like any other and stays approvable.
	const hyperliquidAcceptTermsRequest = (): WalletKitTypes.SessionRequest =>
		({
			id: 2,
			topic: 'mock-topic',
			params: {
				request: {
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: [
						HOLDER,
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
				},
				chainId: ETHEREUM_NETWORK.chainId.toString()
			},
			verifyContext: {
				verified: {
					verifyUrl: 'https://verify.walletconnect.org',
					validation: 'VALID',
					origin: 'https://app.hyperliquid.xyz',
					isScam: false
				}
			}
		}) as unknown as WalletKitTypes.SessionRequest;

	const props = { onApprove: vi.fn(), onReject: vi.fn() };

	it('warns and disables approval for a type-invalid permit', () => {
		const { getByText, getByRole } = render(WalletConnectSignReview, {
			props: { ...props, request: daiPermitRequest('false') }
		});

		expect(getByText(en.wallet_connect.text.invalid_typed_data)).toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).toBeDisabled();
	});

	it('does not warn and keeps approval enabled for a valid permit', () => {
		const { queryByText, getByRole } = render(WalletConnectSignReview, {
			props: { ...props, request: daiPermitRequest(true) }
		});

		expect(queryByText(en.wallet_connect.text.invalid_typed_data)).not.toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
	});

	it('keeps approval enabled for a Hyperliquid action carrying undeclared routing fields', () => {
		const { getByText, queryByText, getByRole } = render(WalletConnectSignReview, {
			props: { ...props, request: hyperliquidAcceptTermsRequest() }
		});

		expect(queryByText(en.wallet_connect.text.invalid_typed_data)).not.toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.unsigned_typed_data_keys)).toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
	});
});
