export enum InternetIdentityDomain {
	VERSION_1_0_LEGACY = 'identity.ic0.app',
	VERSION_1_0 = 'identity.internetcomputer.org',
	VERSION_2_0 = 'beta.id.ai'
}

/**
 * The OpenID provider identifiers supported by `@icp-sdk/auth` v6 for
 * One-Click sign-in through Internet Identity 2.0.
 *
 * The SDK uses the literal string values below — they are NOT a local
 * convention. See `@icp-sdk/auth/client` for the source of truth.
 */
export type OpenIdProvider = 'google' | 'apple' | 'microsoft';
