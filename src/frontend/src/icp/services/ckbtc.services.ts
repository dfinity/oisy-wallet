import type { IcToken } from '$icp/types/ic';
import type { OptionIdentity } from '$lib/types/identity';
import type { SendParams, TransferParams } from '$lib/types/send';
import {SendStep} from "$lib/enums/steps";
import {approve} from "$icp/api/icrc-ledger.api";
import {nowInBigIntNanoSeconds} from "$icp/utils/date.utils";

export const convertCkBTCToBtc = async ({
	token: { standard, ledgerCanisterId },
    progress,
	...rest
}: Pick<TransferParams, 'amount' | 'to'> & {
	identity: OptionIdentity;
	token: IcToken;
} & Pick<SendParams, 'progress'>): Promise<bigint> => {
    progress(SendStep.INITIALIZATION);


    progress(SendStep.APPROVE);

    await approve({
        identity,
        canisterId: universeId,
        amount: numberToE8s(amount),
        expiresAt: nowInBigIntNanoSeconds() + BigInt(5 * NANO_SECONDS_IN_MINUTE),
        spender: minterCanisterId,
    });
};
