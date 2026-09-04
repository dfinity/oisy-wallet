import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
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
	// They are absent from the digest, so the request signs like any other.
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
				// Hyperliquid signs its actions under an Arbitrum domain, so that is the chain its
				// session connects for and the one the domain is held to.
				chainId: `eip155:${ARBITRUM_MAINNET_NETWORK.chainId}`
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

	// USDC's gasless transfer. Whoever holds the signature can pull the stated value out of the
	// wallet by submitting it to the token contract, with no allowance granted beforehand.
	const transferWithAuthorizationRequest = (): WalletKitTypes.SessionRequest =>
		({
			id: 3,
			topic: 'mock-topic',
			params: {
				request: {
					method: SESSION_REQUEST_ETH_SIGN_V4,
					params: [
						HOLDER,
						JSON.stringify({
							domain: {
								name: 'USD Coin',
								version: '2',
								chainId: '1',
								verifyingContract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
							},
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
							primaryType: 'TransferWithAuthorization',
							message: {
								from: HOLDER,
								to: SPENDER,
								value: '5000000000',
								validAfter: '0',
								validBefore: '1893456000',
								nonce: `0x${'ab'.repeat(32)}`
							}
						})
					]
				},
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

	// A Hyperliquid action is signable and benign, and OISY still cannot say what it authorizes. It
	// is warned about like any other unrecognised schema rather than waved through on the strength
	// of the dApp it came from, which is the cost of not guessing: an acknowledgement, not a block.
	it('warns about a Hyperliquid action without blocking it', () => {
		const { getByText, queryByText, getByRole } = render(WalletConnectSignReview, {
			props: { ...props, request: hyperliquidAcceptTermsRequest() }
		});

		expect(queryByText(en.wallet_connect.text.invalid_typed_data)).not.toBeInTheDocument();
		expect(getByText(en.wallet_connect.text.unreviewable_typed_data)).toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
	});

	// The report that would have come next: a signature that moves USDC, previewed as an application,
	// a method name and a collapsed blob, with nothing said and approval enabled.
	it('warns about an ERC-3009 authorization', () => {
		const { getByText, getByRole } = render(WalletConnectSignReview, {
			props: { ...props, request: transferWithAuthorizationRequest() }
		});

		expect(getByText(en.wallet_connect.text.unreviewable_typed_data)).toBeInTheDocument();
		expect(getByRole('button', { name: en.core.text.approve })).not.toBeDisabled();
	});

	// The RPC method is `eth_signTypedData_v4` for a permit and for a drainer alike, so it is the
	// struct that says what is being signed.
	it('names the struct an unrecognised signature hashes', () => {
		const { getByText, getAllByText } = render(WalletConnectSignReview, {
			props: { ...props, request: transferWithAuthorizationRequest() }
		});

		expect(getByText(en.wallet_connect.text.methods)).toBeInTheDocument();

		// Twice on purpose: the `Type` row states the struct that is hashed, the list below states
		// the whole type graph it belongs to. The row is not a duplicate of the list's first entry,
		// it is the labelled version of it.
		expect(getAllByText('TransferWithAuthorization')).toHaveLength(2);
	});

	it('does not name structs for a schema it can describe', () => {
		const { queryByText } = render(WalletConnectSignReview, {
			props: { ...props, request: daiPermitRequest(true) }
		});

		expect(queryByText(en.wallet_connect.text.methods)).not.toBeInTheDocument();
	});

	// A schema OISY summarizes is not warned about: the review states the spender, the amount and
	// the expiry, so there is nothing it failed to establish.
	it('does not warn about a permit whose schema is recognised', () => {
		const { queryByText } = render(WalletConnectSignReview, {
			props: { ...props, request: daiPermitRequest(true) }
		});

		expect(queryByText(en.wallet_connect.text.unreviewable_typed_data)).not.toBeInTheDocument();
	});
});
