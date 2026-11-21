import { errorDetailToString } from '$lib/utils/error.utils';
import { JsonRpcProvider } from 'ethers/providers';

export type VerifyChainIdResult =
	| { status: 'ok' }
	| { status: 'mismatch'; actualChainId: bigint }
	| { status: 'unreachable'; error: string };

/**
 * Upper bound on how long a single RPC chain-ID probe may block the UI.
 * The user is waiting on an "Add network" click, so a dead-quiet endpoint
 * must not hang the CTA indefinitely. MetaMask uses ~10s; we pick 5s as
 * a tighter default for a background form validation step.
 */
export const VERIFY_CHAIN_ID_TIMEOUT_MS = 5_000;

/**
 * Probes an RPC endpoint with `eth_chainId` (via ethers' `getNetwork`) and
 * checks the response against the chain ID the user entered.
 *
 * Mirrors the MetaMask "Add network" safety check: a custom chain is only
 * accepted when the RPC's self-reported chain ID matches what the user
 * typed, preventing phishing RPCs from masquerading as a known chain.
 *
 * This function constructs a throwaway provider without `staticNetwork` so
 * ethers actually issues the chain-ID probe, then destroys the provider to
 * release its network resources. The probe is raced against a fixed
 * timeout so a silently-hung endpoint surfaces as `unreachable` instead of
 * blocking the caller forever.
 */
export const verifyChainId = async ({
	rpcUrl,
	expectedChainId
}: {
	rpcUrl: string;
	expectedChainId: bigint;
}): Promise<VerifyChainIdResult> => {
	let provider: JsonRpcProvider | undefined;
	let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
	try {
		provider = new JsonRpcProvider(rpcUrl);
		const probe = provider.getNetwork().then(({ chainId }) => chainId);
		const timeout = new Promise<never>((_, reject) => {
			timeoutHandle = setTimeout(
				() => reject(new Error(`RPC probe timed out after ${VERIFY_CHAIN_ID_TIMEOUT_MS}ms`)),
				VERIFY_CHAIN_ID_TIMEOUT_MS
			);
		});
		const chainId = await Promise.race([probe, timeout]);
		return chainId === expectedChainId
			? { status: 'ok' }
			: { status: 'mismatch', actualChainId: chainId };
	} catch (err: unknown) {
		return { status: 'unreachable', error: errorDetailToString(err) ?? `${err}` };
	} finally {
		if (timeoutHandle !== undefined) {
			clearTimeout(timeoutHandle);
		}
		// `destroy()` also aborts the in-flight `getNetwork` fetch on timeout,
		// so the losing race branch can't keep the connection alive.
		provider?.destroy();
	}
};
