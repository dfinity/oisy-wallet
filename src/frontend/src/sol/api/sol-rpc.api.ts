import { SOL_RPC_CANISTER_ID } from '$lib/constants/app.constants';
import type { SolAddress } from '$lib/types/address';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { SolRpcCanister } from '$sol/canisters/sol-rpc.canister';
import type { SolanaNetworkType } from '$sol/types/network';
import type { ParsedAccountInfo } from '$sol/types/sol-rpc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';

let canister: SolRpcCanister | undefined = undefined;

export const getAccountInfo = async ({
	identity,
	...rest
}: CanisterApiFunctionParams<{
	address: SolAddress;
	network: SolanaNetworkType;
}>): Promise<ParsedAccountInfo | undefined> => {
	const { getAccountInfo } = await solRpcCanister({ identity });

	const accountInfo = await getAccountInfo(rest);

	if (isNullish(accountInfo)) {
		return;
	}

	if (!('json' in accountInfo.data)) {
		return;
	}

	return {
		...accountInfo,
		data: {
			...accountInfo.data,
			json: {
				...accountInfo.data.json,
				parsed: JSON.parse(accountInfo.data.json.parsed)
			}
		}
	};
};

const solRpcCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = SOL_RPC_CANISTER_ID
}: CanisterApiFunctionParams): Promise<SolRpcCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await SolRpcCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
