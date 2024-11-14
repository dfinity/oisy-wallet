import * as btcSendService from '$btc/services/btc-send.services';
import { type SendBtcParams } from '$btc/services/btc-send.services';
import { convertNumberToSatoshis } from '$btc/utils/btc-send.utils';
import * as backendAPI from '$lib/api/backend.api';
import * as signerAPI from '$lib/api/signer.api';
import { ProgressStepsSendBtc } from '$lib/enums/progress-steps';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import * as walletUtils from '$lib/utils/wallet.utils';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
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

	beforeEach(() => {
		mockPage.reset();
	});

	describe('sendBtc', () => {
		it('should call all required functions', async () => {
			const addPendingBtcTransactionSpy = vi
				.spyOn(backendAPI, 'addPendingBtcTransaction')
				.mockResolvedValue(true);
			const sendBtcApiSpy = vi.spyOn(signerAPI, 'sendBtc').mockResolvedValue({ txid });
			const progressSpy = vi.spyOn(defaultParams, 'progress');
			const waitAndTriggerWalletSpy = vi.spyOn(walletUtils, 'waitAndTriggerWallet');

			await btcSendService.sendBtc(defaultParams);

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

			expect(waitAndTriggerWalletSpy).toHaveBeenCalledOnce();
		});
	});
});
