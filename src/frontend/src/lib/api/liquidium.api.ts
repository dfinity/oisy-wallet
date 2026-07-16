import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { alchemyProviders } from '$eth/providers/alchemy.providers';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish } from '@dfinity/utils';
import { LiquidiumClient, type LiquidiumClientConfig } from '@liquidium/client';

// Liquidium SDK client for the signed-in identity, reusing oisy's Alchemy viem
// client for the SDK's EVM reads (no extra RPC secret). Environment defaults to mainnet.
export const liquidiumClient = ({
	identity,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams): LiquidiumClient => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return new LiquidiumClient({
		// @icp-sdk/core v4 (oisy) ↔ v5 (SDK, isolated via package.json `overrides`) seam:
		// the Identity types are structurally identical but nominally distinct, so the SDK
		// boundary needs this cast — the one sanctioned exception to the no-`as unknown as` rule.
		identity: identity as unknown as LiquidiumClientConfig['identity'],
		evmPublicClient: alchemyProviders(ETHEREUM_NETWORK_ID).readContractClient
	});
};
