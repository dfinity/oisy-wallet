import { sendBtc, type SendBtcParams } from '$btc/services/btc-send.services';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import * as backendAPI from '$lib/api/backend.api';
import * as signerAPI from '$lib/api/signer.api';
import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { hexStringToUint8Array, toNullable } from '@dfinity/utils';

describe('btc-send.services', () => {
	const defaultParams = {
		progress: () => {},
		utxosFee: mockUtxosFee,
		network: 'mainnet',
		source: 'address',
		destination: 'address',
		identity: mockIdentity,
		amount: 10
	} as SendBtcParams;
	const txid = 'txid;';
	const error = new Error('test error');

	beforeEach(() => {});

	describe('sendBtc', () => {
		it('should call all required functions', async () => {
			const addPendingBtcTransactionSpy = vi
				.spyOn(backendAPI, 'addPendingBtcTransaction')
				.mockResolvedValue(true);
			const sendBtcApiSpy = vi.spyOn(signerAPI, 'sendBtc').mockResolvedValue({ txid });
			const progressSpy = vi.spyOn(defaultParams, 'progress');

			await sendBtc(defaultParams);

			expect(progressSpy).toHaveBeenCalledWith(ProgressStepsSendBtc.SEND);

			expect(sendBtcApiSpy).toHaveBeenCalledOnce();
			expect(sendBtcApiSpy).toHaveBeenCalledWith({
				identity: defaultParams.identity,
				network: mapToSignerBitcoinNetwork({ network: defaultParams.network }),
				feeSatoshis: toNullable(defaultParams.utxosFee.feeSatoshis),
				utxosToSpend: defaultParams.utxosFee.utxos,
				outputs: [
					{
						destination_address: defaultParams.destination,
						sent_satoshis: convertNumberToSatoshis({ amount: defaultParams.amount })
					}
				]
			});

			expect(progressSpy).toHaveBeenCalledWith(ProgressStepsSendBtc.RELOAD);

			expect(addPendingBtcTransactionSpy).toHaveBeenCalledOnce();
			expect(addPendingBtcTransactionSpy).toHaveBeenCalledWith({
				identity: defaultParams.identity,
				network: mapToSignerBitcoinNetwork({ network: defaultParams.network }),
				address: defaultParams.source,
				txId: hexStringToUint8Array(txid),
				utxos: defaultParams.utxosFee.utxos
			});
		});

		it('should throw if signer sendBtc throws', async () => {
			vi.spyOn(signerAPI, 'sendBtc').mockImplementation(async () => {
				await Promise.resolve();
				throw error;
			});

			const res = sendBtc(defaultParams);

			await expect(res).rejects.toThrow(error);
		});

		it('should throw if backend addPendingBtcTransaction throws', async () => {
			vi.spyOn(backendAPI, 'addPendingBtcTransaction').mockImplementation(async () => {
				await Promise.resolve();
				throw error;
			});

			const res = sendBtc(defaultParams);

			await expect(res).rejects.toThrow(error);
		});
	});
});
