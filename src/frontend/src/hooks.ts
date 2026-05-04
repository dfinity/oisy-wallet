import { IS_SIGNER_DOMAIN } from '$lib/constants/app.constants';
import type { Reroute } from '@sveltejs/kit';

/**
 * On signer domains (signer.oisy.com, legacy-signer.oisy.com and their staging/beta variants),
 * all routes resolve to /sign so the domain acts as a dedicated signer application.
 *
 * TODO: Currently the full wallet app is deployed to signer canisters even though only /sign is
 * accessible. The browser only loads the chunks it needs (code splitting), so runtime performance
 * is fine, but we pay for unused canister storage. When the signer becomes its own maintained
 * product (Milestone 2+), consider creating a dedicated signer-only SvelteKit build that only
 * includes the (sign) route group to reduce the deployed bundle size.
 */
export const reroute: Reroute = () => {
	if (IS_SIGNER_DOMAIN) {
		return '/sign';
	}
};
