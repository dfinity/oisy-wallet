import { BIP122_MAINNET_CHAINS_KEYS } from '$env/bip122-chains.env';
import { LEGACY_SOLANA_MAINNET_NAMESPACE } from '$env/caip10-chains.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { acceptedContext, getWalletConnectChainName } from '$lib/utils/wallet-connect.utils';
import type { Verify } from '@walletconnect/types';

describe('wallet-connect.utils', () => {
	describe('acceptedContext', () => {
		const context = (verified: Partial<Verify.Context['verified']>): Verify.Context => ({
			verified: {
				verifyUrl: 'https://verify.walletconnect.org',
				validation: 'VALID',
				origin: 'https://dapp.example',
				...verified
			}
		});

		it('accepts a proposal Verify does not flag', () => {
			expect(acceptedContext(context({ isScam: false }))).toBeTruthy();
		});

		it('accepts a proposal Verify returned no scam verdict for', () => {
			expect(acceptedContext(context({}))).toBeTruthy();
		});

		it('accepts a proposal without a verify context', () => {
			expect(acceptedContext(undefined)).toBeTruthy();
		});

		// A flagged site served from its own domain still validates, so the flag alone decides.
		it.each(['VALID', 'INVALID', 'UNKNOWN'] as const)(
			'refuses a proposal Verify flags as a scam when its domain validation is %s',
			(validation) => {
				expect(acceptedContext(context({ validation, isScam: true }))).toBeFalsy();
			}
		);
	});

	describe('getWalletConnectChainName', () => {
		it.each([
			{ chain: `eip155:${ETHEREUM_NETWORK.chainId}`, name: ETHEREUM_NETWORK.name },
			{ chain: `eip155:${BASE_NETWORK.chainId}`, name: BASE_NETWORK.name },
			{ chain: `solana:${SOLANA_MAINNET_NETWORK.chainId}`, name: SOLANA_MAINNET_NETWORK.name },
			{ chain: LEGACY_SOLANA_MAINNET_NAMESPACE, name: SOLANA_MAINNET_NETWORK.name },
			{ chain: BIP122_MAINNET_CHAINS_KEYS[0], name: BTC_MAINNET_NETWORK.name }
		])('names $chain $name', ({ chain, name }) => {
			expect(getWalletConnectChainName(chain)).toBe(name);
		});

		// A chain is never dropped from what the user is shown, even one OISY has no network for.
		it('falls back to the chain itself', () => {
			expect(getWalletConnectChainName('eip155:999999')).toBe('eip155:999999');
		});
	});
});
