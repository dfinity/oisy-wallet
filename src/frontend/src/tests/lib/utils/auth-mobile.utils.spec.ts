import {
	MOBILE_AUTH_CALLBACK_URI,
	MOBILE_AUTH_DELEGATION_PARAM,
	MOBILE_AUTH_OPENID_PROVIDER_PARAM,
	MOBILE_AUTH_REDIRECT_URI_PARAM,
	MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM
} from '$lib/constants/mobile-auth.constants';
import {
	buildIcrc167DelegationUrl,
	buildMobileAuthBridgeUrl,
	buildMobileAuthCallbackUrl,
	isAllowedMobileAuthRedirectUri,
	isIcrc167CallbackUrl,
	isMobileAuthCallbackUrl,
	isOpenIdProvider,
	isValidEd25519DerPublicKey,
	parseIcrc167CallbackUrl,
	parseMobileAuthCallbackUrl
} from '$lib/utils/auth-mobile.utils';
import { uint8ArrayToBase64, uint8ArrayToHexString } from '@dfinity/utils';
import { DelegationChain, Ed25519KeyIdentity } from '@icp-sdk/core/identity';

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

	describe('isValidEd25519DerPublicKey', () => {
		it('should accept a DER-encoded Ed25519 public key', () => {
			const derHex = uint8ArrayToHexString(Ed25519KeyIdentity.generate().getPublicKey().toDer());

			expect(isValidEd25519DerPublicKey(derHex)).toBeTruthy();
		});

		it('should accept an uppercase DER hex', () => {
			const derHex = uint8ArrayToHexString(
				Ed25519KeyIdentity.generate().getPublicKey().toDer()
			).toUpperCase();

			expect(isValidEd25519DerPublicKey(derHex)).toBeTruthy();
		});

		it.each([
			null,
			undefined,
			'',
			'abc',
			'zz11',
			'0x1234',
			'deadbeef ',
			// Even-length hex without the Ed25519 DER prefix.
			'deadbeef',
			// Prefix alone, key bytes missing.
			'302a300506032b6570032100',
			// Prefix with a truncated key.
			`302a300506032b6570032100${'ab'.repeat(31)}`,
			// Prefix with an oversized key.
			`302a300506032b6570032100${'ab'.repeat(33)}`,
			// secp256k1 SubjectPublicKeyInfo prefix instead of Ed25519.
			`3056301006072a8648ce3d020106052b8104000a034200${'ab'.repeat(33)}`
		])('should reject %s', (key) => {
			expect(isValidEd25519DerPublicKey(key)).toBeFalsy();
		});
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

	describe('buildIcrc167DelegationUrl', () => {
		it('should carry the icrc34 request, callback and state in the fragment', () => {
			const url = new URL(
				buildIcrc167DelegationUrl({
					transportUrl: 'https://id.ai/authorize',
					callbackUrl: 'https://audit.oisy.com/signer-callback',
					sessionPublicKeyDerBase64: 'AAAA',
					maxTimeToLive: 123n,
					state: 'nonce'
				})
			);

			expect(url.origin).toBe('https://id.ai');
			expect(url.pathname).toBe('/authorize');

			const params = new URLSearchParams(url.hash.replace(/^#/, ''));

			expect(params.get('callback')).toBe('https://audit.oisy.com/signer-callback');
			expect(params.get('state')).toBe('nonce');

			const message = JSON.parse(params.get('message') ?? '{}');

			expect(message.method).toBe('icrc34_delegation');
			expect(message.params).toEqual({ publicKey: 'AAAA', maxTimeToLive: '123' });
		});
	});

	describe('isIcrc167CallbackUrl', () => {
		const callbackUrl = 'https://audit.oisy.com/signer-callback';

		it.each([callbackUrl, `${callbackUrl}#message=x&state=y`, `${callbackUrl}?foo=bar`])(
			'should accept %s',
			(url) => {
				expect(isIcrc167CallbackUrl({ url, callbackUrl })).toBeTruthy();
			}
		);

		it.each([
			'not a url',
			'https://audit.oisy.com/other-path',
			'https://evil.com/signer-callback',
			'http://audit.oisy.com/signer-callback',
			'oisy://auth-callback#message=x'
		])('should reject %s', (url) => {
			expect(isIcrc167CallbackUrl({ url, callbackUrl })).toBeFalsy();
		});
	});

	describe('parseIcrc167CallbackUrl', () => {
		const callbackUrl = 'https://audit.oisy.com/signer-callback';

		const buildResponseUrl = async (): Promise<{ url: string; sessionDerBase64: string }> => {
			const rootKey = Ed25519KeyIdentity.generate();
			const sessionKey = Ed25519KeyIdentity.generate();
			const chain = await DelegationChain.create(
				rootKey,
				sessionKey.getPublicKey(),
				new Date(Date.now() + 60_000)
			);

			const result = {
				publicKey: uint8ArrayToBase64(new Uint8Array(chain.publicKey)),
				signerDelegation: chain.delegations.map(({ delegation, signature }) => ({
					delegation: {
						pubkey: uint8ArrayToBase64(new Uint8Array(delegation.pubkey)),
						expiration: delegation.expiration.toString()
					},
					signature: uint8ArrayToBase64(new Uint8Array(signature))
				}))
			};

			const message = JSON.stringify({ jsonrpc: '2.0', id: 1, result });
			const params = new URLSearchParams({ message, state: 'nonce' });

			return {
				url: `${callbackUrl}#${params.toString()}`,
				sessionDerBase64: uint8ArrayToBase64(new Uint8Array(sessionKey.getPublicKey().toDer()))
			};
		};

		it('should round-trip a delegation chain and the state', async () => {
			const { url, sessionDerBase64 } = await buildResponseUrl();

			const parsed = parseIcrc167CallbackUrl(url);

			expect(parsed).toBeDefined();
			expect(parsed?.state).toBe('nonce');

			const lastDelegation = parsed?.chain.delegations.at(-1);

			expect(
				uint8ArrayToBase64(new Uint8Array(lastDelegation?.delegation.pubkey ?? new Uint8Array()))
			).toBe(sessionDerBase64);
		});

		it('should throw on a signer-reported JSON-RPC error', () => {
			const message = JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				error: { code: 3001, message: 'Action aborted' }
			});
			const url = `${callbackUrl}#${new URLSearchParams({ message }).toString()}`;

			expect(() => parseIcrc167CallbackUrl(url)).toThrow('Signer error 3001: Action aborted');
		});

		it.each([
			'not a url',
			callbackUrl,
			`${callbackUrl}#state=only`,
			`${callbackUrl}#message=not-json`,
			`${callbackUrl}#message=${encodeURIComponent('{"jsonrpc":"2.0","id":1,"result":{}}')}`,
			`${callbackUrl}#message=${encodeURIComponent('{"jsonrpc":"2.0","id":1,"result":{"publicKey":"AAAA","signerDelegation":[{}]}}')}`
		])('should return undefined for malformed callback %s', (url) => {
			expect(parseIcrc167CallbackUrl(url)).toBeUndefined();
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
