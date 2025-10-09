import type { SwapAmountsReply, TokenReply } from '$declarations/kong_backend/kong_backend.did';
import { KongBackendCanister } from '$lib/canisters/kong_backend.canister';
import { KONG_BACKEND_CANISTER_ID } from '$lib/constants/app.constants';
import type { KongSwapAmountsParams, KongSwapParams } from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: KongBackendCanister | undefined = undefined;

export const kongSwapAmounts = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage,
	...restParams
}: CanisterApiFunctionParams<KongSwapAmountsParams>): Promise<SwapAmountsReply> => {
	const { swapAmounts } = await kongBackendCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return swapAmounts(restParams);
};

export const kongSwap = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage,
	...restParams
}: CanisterApiFunctionParams<KongSwapParams>): Promise<bigint> => {
	const { swap } = await kongBackendCanister({ identity, canisterId, nullishIdentityErrorMessage });

	return swap(restParams);
};

export const kongTokens = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage,
	tokenLedgerCanisterId
}: CanisterApiFunctionParams): Promise<TokenReply[]> => {
	const { tokens } = await kongBackendCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return tokens(tokenLedgerCanisterId);
};

const kongBackendCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = KONG_BACKEND_CANISTER_ID
}: CanisterApiFunctionParams): Promise<KongBackendCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await KongBackendCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
