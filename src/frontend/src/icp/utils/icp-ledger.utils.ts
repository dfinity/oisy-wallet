import { ICP_LEDGER_CANISTER_TESTNET_IDS } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import { nonNullish } from '@dfinity/utils';

export const isTokenIcpTestnet = ({ ledgerCanisterId }: Partial<IcToken>): boolean =>
	nonNullish(ledgerCanisterId) && ICP_LEDGER_CANISTER_TESTNET_IDS.includes(ledgerCanisterId);
