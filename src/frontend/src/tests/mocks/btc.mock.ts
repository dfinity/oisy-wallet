import type { UtxosFee } from '$btc/types/btc-send';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';

export const mockBtcAddress = 'bc1qt0nkp96r7p95xfacyp98pww2eu64yzuf78l4a2wy0sttt83hux4q6u2nl7';

export const mockBtcP2SHAddress = '3AdD7ZaJQw9m1maN39CeJ1zVyXQLn2MEHR';

export const mockUtxo: CkBtcMinterDid.Utxo = {
	height: 1000,
	value: 1n,
	outpoint: {
		txid: Uint8Array.from([1, 2, 3]),
		vout: 1
	}
};

// The fee and the rate must stay consistent: the pre-broadcast validation reprices this
// single-input selection (141 vB) at the rate below and rejects a fee more than 10% off it.
export const mockUtxosFee: UtxosFee = {
	feeSatoshis: 1000n,
	feeRateMiliSatoshisPerVByte: 7000n,
	utxos: [mockUtxo]
};
