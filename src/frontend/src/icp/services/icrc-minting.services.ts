import { getMintingAccount } from '$icp/api/icrc-ledger.api';
import type { IcToken } from '$icp/types/ic-token';
import type { OptionIdentity } from '$lib/types/identity';
import { encodeIcrcAccount, type IcrcAccount } from '@dfinity/ledger-icrc';
import { isNullish } from '@dfinity/utils';

export const isUserMintingAccount = async ({
	identity,
	account,
	token: { ledgerCanisterId }
}: {
	identity: OptionIdentity;
	account: IcrcAccount | undefined;
	token: IcToken;
}): Promise<boolean> => {
	if (isNullish(identity) || isNullish(account)) {
		return false;
	}

	const mintingAccount = await getMintingAccount({
		identity,
		ledgerCanisterId
	});

	if (isNullish(mintingAccount)) {
		return false;
	}

	return encodeIcrcAccount(mintingAccount) === encodeIcrcAccount(account);
};
