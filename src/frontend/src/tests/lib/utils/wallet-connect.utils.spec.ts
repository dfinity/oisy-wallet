import { BIP122_MAINNET_CHAINS_KEYS } from '$env/bip122-chains.env';
import { LEGACY_SOLANA_MAINNET_NAMESPACE } from '$env/caip10-chains.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import {
	acceptedContext,
	getWalletConnectChainName,
	visibleMessageText
} from '$lib/utils/wallet-connect.utils';
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

	describe('visibleMessageText', () => {
		it('keeps an ordinary message as it is', () => {
			const message = 'Sign in to Example\n\nNonce: 42\n\tIssued At: 2026-10-29';

			expect(visibleMessageText(message)).toBe(message);
		});

		it('keeps right-to-left letters, accents and emoji', () => {
			const message = 'שלום مرحبا café 🙂';

			expect(visibleMessageText(message)).toBe(message);
		});

		// With the override, the digits read in reverse: "Pay 1000 USDC".
		it('shows the characters of a right-to-left override in the order they are signed', () => {
			expect(visibleMessageText('Pay \u202E0001\u202C USDC to Example')).toBe(
				'Pay 0001 USDC to Example'
			);
		});

		it.each([
			{ name: 'left-to-right embedding', character: '\u202A' },
			{ name: 'right-to-left embedding', character: '\u202B' },
			{ name: 'pop directional formatting', character: '\u202C' },
			{ name: 'left-to-right override', character: '\u202D' },
			{ name: 'right-to-left override', character: '\u202E' },
			{ name: 'left-to-right isolate', character: '\u2066' },
			{ name: 'right-to-left isolate', character: '\u2067' },
			{ name: 'first strong isolate', character: '\u2068' },
			{ name: 'pop directional isolate', character: '\u2069' },
			{ name: 'left-to-right mark', character: '\u200E' },
			{ name: 'right-to-left mark', character: '\u200F' },
			{ name: 'Arabic letter mark', character: '\u061C' },
			{ name: 'null', character: '\u0000' },
			{ name: 'escape', character: '\u001B' },
			{ name: 'next line', character: '\u0085' }
		])('leaves out a $name', ({ character }) => {
			expect(visibleMessageText(`Sign${character} in`)).toBe('Sign in');
		});

		it.each([
			{ name: 'zero-width space', character: '\u200B' },
			{ name: 'zero-width non-joiner', character: '\u200C' },
			{ name: 'zero-width joiner', character: '\u200D' },
			{ name: 'word joiner', character: '\u2060' },
			{ name: 'byte order mark', character: '\uFEFF' },
			{ name: 'soft hyphen', character: '\u00AD' },
			{ name: 'variation selector', character: '\uFE0F' }
		])('keeps a $name', ({ character }) => {
			expect(visibleMessageText(`Sign${character} in`)).toBe(`Sign${character} in`);
		});

		it.each([
			{ name: 'the Arabic number sign before digits', message: '\u0600123' },
			{ name: 'an emoji joined by a zero-width joiner', message: '\u{1F469}\u200D\u2695\uFE0F' },
			{
				name: 'a flag built from tag characters',
				message: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}'
			}
		])('keeps $name', ({ message }) => {
			expect(visibleMessageText(message)).toBe(message);
		});

		it('turns carriage returns into line breaks', () => {
			expect(visibleMessageText('one\r\ntwo\rthree')).toBe('one\ntwo\nthree');
		});
	});
});
