import type { IcTransactionIdText } from '$icp/types/ic';
import { UpdateBalanceCkBtcStep } from '$lib/enums/steps';
import type { OptionIdentity } from '$lib/types/identity';
import type { RetrieveBtcStatusV2 } from '@dfinity/ckbtc/dist/candid/minter';

export interface CkBtcUpdateBalanceParams {
	identity: OptionIdentity;
	progress: (step: UpdateBalanceCkBtcStep) => void;
}

export type BtcWithdrawalStatuses = Record<IcTransactionIdText, RetrieveBtcStatusV2>;
