import type { IcTransactionIdText } from '$icp/types/ic-transaction';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';

export type BtcWithdrawalStatuses = Record<IcTransactionIdText, CkBtcMinterDid.RetrieveBtcStatusV2>;
