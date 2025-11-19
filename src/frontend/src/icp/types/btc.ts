import type { IcTransactionIdText } from '$icp/types/ic-transaction';
import type { RetrieveBtcStatusV2 } from '@icp-sdk/canisters/ckbtc';

export type BtcWithdrawalStatuses = Record<IcTransactionIdText, RetrieveBtcStatusV2>;
