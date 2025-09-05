import {
	IC_CKBTC_INDEX_CANISTER_ID,
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCkToken } from '$icp/types/ic-token';
import { token } from '$lib/stores/token.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockCkBtcMinterInfo, mockPendingUtxo } from '$tests/mocks/ckbtc.mock';

export const setupCkBTCStores = (): TokenId => {
	const tokenId: TokenId = parseTokenId('test');

	const mockToken: IcCkToken = {
		id: tokenId,
		standard: 'icrc',
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
		indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID,
		minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
	} as unknown as IcCkToken;

	token.set(mockToken);

	ckBtcMinterInfoStore.set({
		id: tokenId,
		data: {
			data: mockCkBtcMinterInfo,
			certified: true
		}
	});

	ckBtcPendingUtxosStore.set({
		id: tokenId,
		data: {
			data: [mockPendingUtxo],
			certified: true
		}
	});

	return tokenId;
};
