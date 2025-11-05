import type { UtxosFee } from '$btc/types/btc-send';
import type { Utxo } from '@dfinity/ckbtc/dist/candid/minter';

export const mockBtcAddress = 'bc1qt0nkp96r7p95xfacyp98pww2eu64yzuf78l4a2wy0sttt83hux4q6u2nl7';

export const mockBtcP2SHAddress = '3AdD7ZaJQw9m1maN39CeJ1zVyXQLn2MEHR';

export const mockUtxo: Utxo = {
	height: 1000,
	value: 1n,
	outpoint: {
		txid: [1, 2, 3],
		vout: 1
	}
};

export const mockUtxosFee: UtxosFee = {
	feeSatoshis: 1000n,
	utxos: [mockUtxo]
};
