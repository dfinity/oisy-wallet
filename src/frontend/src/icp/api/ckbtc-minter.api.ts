import type { MinterInfoParams } from '$icp/types/ck';
import { getAgent } from '$lib/actors/agents.ic';
import { i18n } from '$lib/stores/i18n.store';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import type {
	EstimateWithdrawalFee,
	EstimateWithdrawalFeeParams,
	MinterInfo,
	RetrieveBtcOk,
	RetrieveBtcStatusV2WithId,
	UpdateBalanceOk,
	Utxo
} from '@dfinity/ckbtc';
import { CkBTCMinterCanister } from '@dfinity/ckbtc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { get } from 'svelte/store';

export const retrieveBtc = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
	amount: bigint;
	address: string;
}): Promise<RetrieveBtcOk> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { retrieveBtcWithApproval } = await minterCanister({ identity, minterCanisterId });

	return retrieveBtcWithApproval(params);
};

export const updateBalance = async ({
	identity,
	minterCanisterId
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<UpdateBalanceOk> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { updateBalance } = await minterCanister({ identity, minterCanisterId });

	return updateBalance(minterAccountParams({ identity }));
};

export const minterInfo = async ({
	identity,
	minterCanisterId,
	...rest
}: MinterInfoParams): Promise<MinterInfo> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { getMinterInfo } = await minterCanister({ identity, minterCanisterId });

	return getMinterInfo(rest);
};

export const getBtcAddress = async ({
	identity,
	minterCanisterId
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<string> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { getBtcAddress } = await minterCanister({ identity, minterCanisterId });

	return getBtcAddress(minterAccountParams({ identity }));
};

export const estimateFee = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & EstimateWithdrawalFeeParams): Promise<EstimateWithdrawalFee> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { estimateWithdrawalFee } = await minterCanister({ identity, minterCanisterId });

	return estimateWithdrawalFee(params);
};

export const withdrawalStatuses = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & Required<QueryParams>): Promise<RetrieveBtcStatusV2WithId[]> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { retrieveBtcStatusV2ByAccount } = await minterCanister({ identity, minterCanisterId });

	return retrieveBtcStatusV2ByAccount(params);
};

export const getKnownUtxos = async ({
	identity,
	minterCanisterId
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<Utxo[]> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { getKnownUtxos } = await minterCanister({ identity, minterCanisterId });

	return getKnownUtxos(minterAccountParams({ identity }));
};

const minterCanister = async ({
	identity,
	minterCanisterId
}: {
	identity: Identity;
	minterCanisterId: CanisterIdText;
}): Promise<CkBTCMinterCanister> => {
	const agent = await getAgent({ identity });

	return CkBTCMinterCanister.create({
		agent,
		canisterId: Principal.fromText(minterCanisterId)
	});
};

const minterAccountParams = ({ identity }: { identity: Identity }): { owner: Principal } => {
	// We use the identity to follow NNS-dapp's scheme but, if it would not be provided, it would be the same result.
	// If "owner" is not provided, the minter canister uses the "caller" as a fallback.
	return {
		owner: identity.getPrincipal()
	};
};
