import type { IcTransactionIdText } from '$icp/types/ic-transaction';
import type { RetrieveBtcStatusV2 } from '@dfinity/ckbtc';

export type BtcWithdrawalStatuses = Record<IcTransactionIdText, RetrieveBtcStatusV2>;

export enum BtcTransactionSpeed {
	slow = 'slow',
	normal = 'normal',
	fast = 'fast'
}
