import {
	MOBILE_AUTH_CALLBACK_URI,
	MOBILE_AUTH_DELEGATION_PARAM,
	MOBILE_AUTH_REDIRECT_URI_PARAM,
	MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM
} from '$lib/constants/mobile-auth.constants';
import {
	buildMobileAuthBridgeUrl,
	buildMobileAuthCallbackUrl,
	isAllowedMobileAuthRedirectUri,
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

	describe('buildMobileAuthBridgeUrl', () => {
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
