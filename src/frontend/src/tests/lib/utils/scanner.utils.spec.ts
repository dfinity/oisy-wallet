import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';
import { extractWalletConnectUri } from '$lib/utils/scanner.utils';

describe('scanner.utils', () => {
	describe('extractWalletConnectUri', () => {
		const walletConnectUri =
			'wc:e200131008fe2318715564ff7723539fcd4fbeccf663da06f55f4035a0911dcd@2?expiryTimestamp=1784537876&relay-protocol=irn&symKey=d764c4aa582d1d8e2b258e637c51e3b3522778ce2d06a0e3a885ac2c88813418';

		const deepLink = ({
			host,
			path,
			param
		}: { host?: string; path?: string; param?: string } = {}): string =>
			`https://${host ?? OISY_URL_HOSTNAME}${path ?? '/wc/'}?${param ?? `uri=${encodeURIComponent(walletConnectUri)}`}`;

		it('returns a bare wc: URI unchanged', () => {
			expect(extractWalletConnectUri(walletConnectUri)).toEqual({
				type: 'uri',
				uri: walletConnectUri
			});
		});

		it('unwraps an OISY WalletConnect deep-link URL to its inner wc: URI', () => {
			expect(extractWalletConnectUri(deepLink())).toEqual({ type: 'uri', uri: walletConnectUri });
		});

		it('percent-decodes the uri param', () => {
			const encoded = `https://${OISY_URL_HOSTNAME}/wc/?uri=wc%3Aabc123%402%3Frelay-protocol%3Dirn`;

			expect(extractWalletConnectUri(encoded)).toEqual({
				type: 'uri',
				uri: 'wc:abc123@2?relay-protocol=irn'
			});
		});

		it('accepts the /wc path without a trailing slash', () => {
			expect(extractWalletConnectUri(deepLink({ path: '/wc' }))).toEqual({
				type: 'uri',
				uri: walletConnectUri
			});
		});

		it('flags a well-formed deep link on a non-OISY host as wrong-domain', () => {
			expect(extractWalletConnectUri(deepLink({ host: 'evil.example' }))).toEqual({
				type: 'wrong-domain'
			});
		});

		it('returns undefined for an OISY URL on a different path', () => {
			expect(extractWalletConnectUri(deepLink({ path: '/tokens/' }))).toBeUndefined();
		});

		it('returns undefined when the uri param is absent', () => {
			expect(extractWalletConnectUri(deepLink({ param: 'foo=bar' }))).toBeUndefined();
		});

		it('returns undefined when the uri param is not a wc: value', () => {
			expect(
				extractWalletConnectUri(
					deepLink({ param: `uri=${encodeURIComponent('https://oisy.com')}` })
				)
			).toBeUndefined();
		});

		it('returns undefined for a non-wc deep link on a non-OISY host', () => {
			expect(
				extractWalletConnectUri(`https://evil.example/wc/?uri=${encodeURIComponent('https://x')}`)
			).toBeUndefined();
		});

		it('returns undefined for a non-URL string', () => {
			expect(extractWalletConnectUri('not a url')).toBeUndefined();
			expect(extractWalletConnectUri('')).toBeUndefined();
		});
	});
});
