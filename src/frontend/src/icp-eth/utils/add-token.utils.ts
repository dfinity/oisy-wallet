import type { AddTokenData } from '$icp-eth/types/add-token';

// The contract, mint, ledger or collection canister the user entered, whichever the network takes.
export const getAddTokenDataIdentifier = (tokenData: Partial<AddTokenData>): string | undefined =>
	tokenData.ledgerCanisterId ??
	tokenData.extCanisterId ??
	tokenData.dip721CanisterId ??
	tokenData.icPunksCanisterId ??
	tokenData.icrc7CanisterId ??
	tokenData.ethContractAddress ??
	tokenData.splTokenAddress;
