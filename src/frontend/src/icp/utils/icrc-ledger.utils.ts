import { ICRC_LEDGER_CANISTER_TESTNET_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.testnet.env';
import type { IcToken } from '$icp/types/ic-token';
import { nonNullish } from '@dfinity/utils';

export const isTokenIcrcTestnet = ({ ledgerCanisterId }: Partial<IcToken>): boolean =>
	nonNullish(ledgerCanisterId) && ICRC_LEDGER_CANISTER_TESTNET_IDS.includes(ledgerCanisterId);
