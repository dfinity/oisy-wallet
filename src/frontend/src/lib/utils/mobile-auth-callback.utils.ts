// Keep the destination fixed. Callback contents must never select a URL or origin.
// Signature, state, key and lifetime validation remain in the native auth owner.
export const getMobileAuthCallbackUrl = (hash: string): string | undefined => {
	if (
		!hash.startsWith('#') ||
		hash.length <= 1 ||
		new TextEncoder().encode(hash.slice(1)).length > 65_536
	) {
		return undefined;
	}
	return `oisy://auth-callback${hash}`;
};
