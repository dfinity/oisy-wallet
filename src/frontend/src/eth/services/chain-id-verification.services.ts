import { JsonRpcProvider } from 'ethers/providers';

export type VerifyChainIdResult =
	| { status: 'ok' }
	| { status: 'mismatch'; actualChainId: bigint }
	| { status: 'unreachable'; error: string };

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
 * release its network resources.
 */
export const verifyChainId = async ({
	rpcUrl,
	expectedChainId
}: {
	rpcUrl: string;
	expectedChainId: bigint;
}): Promise<VerifyChainIdResult> => {
	let provider: JsonRpcProvider | undefined;
	try {
		provider = new JsonRpcProvider(rpcUrl);
		const { chainId } = await provider.getNetwork();
		return chainId === expectedChainId
			? { status: 'ok' }
			: { status: 'mismatch', actualChainId: chainId };
	} catch (err: unknown) {
		return { status: 'unreachable', error: `${err}` };
	} finally {
		provider?.destroy();
	}
};
