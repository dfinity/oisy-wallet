import { SWAP_PROVIDER_GUARANTEES_MINIMUM } from '$lib/constants/swap.constants';
import type { SwapProvider } from '$lib/types/swap';

// Every provider on main guarantees a minimum, so a spec flips the map itself to test an
// unprotected offer. Each spec file gets its own module instance, so a flip stays in its file until
// `restoreProtection` undoes it.
const declaredProtection = { ...SWAP_PROVIDER_GUARANTEES_MINIMUM };

export const markUnprotected = (...providers: SwapProvider[]) =>
	providers.forEach((provider) => (SWAP_PROVIDER_GUARANTEES_MINIMUM[provider] = false));

export const markProtected = (...providers: SwapProvider[]) =>
	providers.forEach((provider) => (SWAP_PROVIDER_GUARANTEES_MINIMUM[provider] = true));

export const restoreProtection = () =>
	Object.assign(SWAP_PROVIDER_GUARANTEES_MINIMUM, declaredProtection);
