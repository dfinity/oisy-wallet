import {
	MOBILE_AUTH_CALLBACK_URI,
	MOBILE_AUTH_DELEGATION_PARAM,
	MOBILE_AUTH_OPENID_PROVIDER_PARAM,
	MOBILE_AUTH_REDIRECT_URI_PARAM,
	MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM
} from '$lib/constants/mobile-auth.constants';
import {
	buildMobileAuthBridgeUrl,
	buildMobileAuthCallbackUrl,
	isAllowedMobileAuthRedirectUri,
	isMobileAuthCallbackUrl,
	isOpenIdProvider,
	isValidHexPublicKey,
	parseMobileAuthCallbackUrl
} from '$lib/utils/auth-mobile.utils';

describe('auth-mobile utils', () => {
	describe('isAllowedMobileAuthRedirectUri', () => {
		it('should accept the allowlisted callback URI', () => {
			expect(isAllowedMobileAuthRedirectUri(MOBILE_AUTH_CALLBACK_URI)).toBeTruthy();
		});

		it.each([
			null,
			undefined,
			'',
			'oisy://other-callback',
			'https://attacker.com/auth-callback',
			`${MOBILE_AUTH_CALLBACK_URI}/extra`,
			` ${MOBILE_AUTH_CALLBACK_URI}`
		])('should reject %s', (uri) => {
			expect(isAllowedMobileAuthRedirectUri(uri)).toBeFalsy();
		});
	});

	describe('isValidHexPublicKey', () => {
		it('should accept an even-length hex string', () => {
			expect(isValidHexPublicKey('302a300506032b6570032100ab')).toBeTruthy();
		});

		it.each([null, undefined, '', 'abc', 'zz11', '0x1234', 'deadbeef '])(
			'should reject %s',
			(key) => {
				expect(isValidHexPublicKey(key)).toBeFalsy();
			}
		);
	});

	describe('isOpenIdProvider', () => {
		it.each(['google', 'apple', 'microsoft'])('should accept %s', (provider) => {
			expect(isOpenIdProvider(provider)).toBeTruthy();
		});

		it.each([null, undefined, '', 'facebook', 'Google', ' google'])(
			'should reject %s',
			(provider) => {
				expect(isOpenIdProvider(provider)).toBeFalsy();
			}
		);
	});

	describe('isMobileAuthCallbackUrl', () => {
		it.each([
			MOBILE_AUTH_CALLBACK_URI,
			`${MOBILE_AUTH_CALLBACK_URI}#delegation=abc`,
			`${MOBILE_AUTH_CALLBACK_URI}/`
		])('should accept %s', (url) => {
			expect(isMobileAuthCallbackUrl(url)).toBeTruthy();
		});

		it.each([
			'not a url',
			'',
			'https://oisy.com/auth-callback',
			'oisy://auth-callback.evil/#delegation=abc',
			'oisy://evil-auth-callback#delegation=abc',
			'evil://auth-callback#delegation=abc'
		])('should reject the lookalike/foreign URL %s', (url) => {
			expect(isMobileAuthCallbackUrl(url)).toBeFalsy();
		});
	});

	describe('buildMobileAuthBridgeUrl', () => {
		it('should omit the OpenID provider param by default and include it when provided', () => {
			const withoutProvider = new URL(
				buildMobileAuthBridgeUrl({
					baseUrl: 'https://oisy.com',
					sessionPublicKeyDerHex: 'deadbeef',
					redirectUri: MOBILE_AUTH_CALLBACK_URI
				})
			);

			expect(withoutProvider.searchParams.has(MOBILE_AUTH_OPENID_PROVIDER_PARAM)).toBeFalsy();

			const withProvider = new URL(
				buildMobileAuthBridgeUrl({
					baseUrl: 'https://oisy.com',
					sessionPublicKeyDerHex: 'deadbeef',
					redirectUri: MOBILE_AUTH_CALLBACK_URI,
					openIdProvider: 'google'
				})
			);

			expect(withProvider.searchParams.get(MOBILE_AUTH_OPENID_PROVIDER_PARAM)).toBe('google');
		});

		it('should build the bridge URL with both params', () => {
			const url = new URL(
				buildMobileAuthBridgeUrl({
					baseUrl: 'https://oisy.com',
					sessionPublicKeyDerHex: 'deadbeef',
					redirectUri: MOBILE_AUTH_CALLBACK_URI
				})
			);

			expect(url.origin).toBe('https://oisy.com');
			expect(url.pathname).toBe('/mobile-auth');
			expect(url.searchParams.get(MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM)).toBe('deadbeef');
			expect(url.searchParams.get(MOBILE_AUTH_REDIRECT_URI_PARAM)).toBe(MOBILE_AUTH_CALLBACK_URI);
		});
	});

	describe('buildMobileAuthCallbackUrl and parseMobileAuthCallbackUrl', () => {
		const delegationChainJson = JSON.stringify({
			delegations: [{ delegation: { pubkey: 'aa', expiration: '1' }, signature: 'bb' }],
			publicKey: 'cc'
		});

		it('should round-trip the delegation chain through the fragment', () => {
			const url = buildMobileAuthCallbackUrl({
				redirectUri: MOBILE_AUTH_CALLBACK_URI,
				delegationChainJson
			});

			expect(url.startsWith(`${MOBILE_AUTH_CALLBACK_URI}#`)).toBeTruthy();
			// The chain must ride in the fragment only — never in the query string.
			expect(new URL(url).search).toBe('');
			expect(parseMobileAuthCallbackUrl(url)).toBe(delegationChainJson);
		});

		it.each([
			'not a url',
			MOBILE_AUTH_CALLBACK_URI,
			`${MOBILE_AUTH_CALLBACK_URI}#`,
			`${MOBILE_AUTH_CALLBACK_URI}#${MOBILE_AUTH_DELEGATION_PARAM}=`,
			`${MOBILE_AUTH_CALLBACK_URI}#other=value`,
			`${MOBILE_AUTH_CALLBACK_URI}?${MOBILE_AUTH_DELEGATION_PARAM}=query-not-fragment`
		])('should return undefined for %s', (url) => {
			expect(parseMobileAuthCallbackUrl(url)).toBeUndefined();
		});
	});
});
