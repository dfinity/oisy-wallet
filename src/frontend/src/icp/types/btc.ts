import type { IcTransactionIdText } from '$icp/types/ic';
import type { RetrieveBtcStatusV2 } from '@dfinity/ckbtc';

export type BtcWithdrawalStatuses = Record<IcTransactionIdText, RetrieveBtcStatusV2>;
