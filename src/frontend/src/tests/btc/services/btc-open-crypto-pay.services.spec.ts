import { calculateBtcFee, payBtc } from '$btc/services/btc-open-crypto-pay.services';
import * as btcSendServices from '$btc/services/btc-send.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import type { AllUtxosStore } from '$btc/stores/all-utxos.store';
import * as allUtxosStoreLib from '$btc/stores/all-utxos.store';
import type { FeeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import * as feeRatePercentilesStoreLib from '$btc/stores/fee-rate-percentiles.store';
import type { OptionBtcAddress } from '$btc/types/address';
import type { UtxosFee } from '$btc/types/btc-send';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import * as backendApi from '$lib/api/backend.api';
import * as addressDerived from '$lib/derived/address.derived';
import { ProgressStepsPayment } from '$lib/enums/progress-steps';
import { fetchOpenCryptoPay } from '$lib/rest/open-crypto-pay.rest';
import type {
	PayableToken,
	PayableTokenWithConvertedAmount,
	ValidatedBtcPaymentData
} from '$lib/types/open-crypto-pay';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { BitcoinDid } from '@icp-sdk/canisters/ckbtc';
import { readable } from 'svelte/store';

vi.mock('$lib/rest/open-crypto-pay.rest', () => ({
	fetchOpenCryptoPay: vi.fn()
}));

vi.mock('$btc/services/btc-send.services', () => ({
	signBtc: vi.fn()
}));

vi.mock('$lib/api/backend.api', () => ({
	addPendingBtcTransaction: vi.fn()
}));

describe('btc-open-crypto-pay.services', () => {
	describe('calculateBtcFee', () => {
		const mockBtcAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

		const mockBtcAddressStore = (address: OptionBtcAddress) => {
			vi.spyOn(addressDerived, 'btcAddressMainnet', 'get').mockReturnValue(readable(address));
		};

		const mockFeeRateStore = (feeRate: bigint | undefined) => {
			const storeValue = feeRate !== undefined ? { feeRateFromPercentiles: feeRate } : null;
			vi.spyOn(feeRatePercentilesStoreLib, 'feeRatePercentilesStore', 'get').mockReturnValue({
				subscribe: readable(storeValue).subscribe,
				setFeeRateFromPercentiles: vi.fn(),
				reset: vi.fn()
			} as unknown as FeeRatePercentilesStore);
		};

		const mockUtxosStore = (utxos: BitcoinDid.utxo[] | undefined) => {
			const storeValue = utxos !== undefined ? { allUtxos: utxos } : null;
			vi.spyOn(allUtxosStoreLib, 'allUtxosStore', 'get').mockReturnValue({
				subscribe: readable(storeValue).subscribe,
				setAllUtxos: vi.fn(),
				reset: vi.fn()
			} as unknown as AllUtxosStore);
		};

		const baseToken: PayableToken = {
			...BTC_MAINNET_TOKEN,
			tokenNetwork: 'Bitcoin',
			amount: '0.001',
			minFee: 0
		};

		const mockUtxosFee: UtxosFee = {
			feeSatoshis: 1000n,
			utxos: []
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(btcUtxosService, 'prepareBtcSend').mockReturnValue(mockUtxosFee);
		});

		describe('input validation', () => {
			it('should return undefined when btcAddress is null', () => {
				mockBtcAddressStore(null);
				mockFeeRateStore(1000n);
				mockUtxosStore([]);

				const result = calculateBtcFee(baseToken);

				expect(result).toBeUndefined();
				expect(btcUtxosService.prepareBtcSend).not.toHaveBeenCalled();
			});

			it('should return undefined when btcAddress is undefined', () => {
				mockBtcAddressStore(undefined);
				mockFeeRateStore(1000n);
				mockUtxosStore([]);

				const result = calculateBtcFee(baseToken);

				expect(result).toBeUndefined();
				expect(btcUtxosService.prepareBtcSend).not.toHaveBeenCalled();
			});

			it('should return undefined when feeRatePercentiles is null', () => {
				mockBtcAddressStore(mockBtcAddress);
				mockFeeRateStore(undefined);
				mockUtxosStore([]);

				const result = calculateBtcFee(baseToken);

				expect(result).toBeUndefined();
				expect(btcUtxosService.prepareBtcSend).not.toHaveBeenCalled();
			});

			it('should return undefined when allUtxos is null', () => {
				mockBtcAddressStore(mockBtcAddress);
				mockFeeRateStore(1000n);
				mockUtxosStore(undefined);

				const result = calculateBtcFee(baseToken);

				expect(result).toBeUndefined();
				expect(btcUtxosService.prepareBtcSend).not.toHaveBeenCalled();
			});
		});

		describe('fee calculation', () => {
			it('should calculate fee with store fee rate when higher than minFee', () => {
				mockBtcAddressStore(mockBtcAddress);
				mockFeeRateStore(2000n);
				mockUtxosStore([]);

				const result = calculateBtcFee({ ...baseToken, minFee: 1 });

				expect(result).toBeDefined();
				expect(btcUtxosService.prepareBtcSend).toHaveBeenCalledWith({
					amount: '0.001',
					source: mockBtcAddress,
					allUtxos: [],
					feeRateMiliSatoshisPerVByte: 2000n
				});
			});

			it('should calculate fee with minFee when higher than store fee rate', () => {
				mockBtcAddressStore(mockBtcAddress);
				mockFeeRateStore(500n);
				mockUtxosStore([]);

				const result = calculateBtcFee({ ...baseToken, minFee: 2 });

				expect(result).toBeDefined();
				expect(btcUtxosService.prepareBtcSend).toHaveBeenCalledWith({
					amount: '0.001',
					source: mockBtcAddress,
					allUtxos: [],
					feeRateMiliSatoshisPerVByte: 2000n
				});
			});

			it('should use zero for minFee when minFee is null', () => {
				mockBtcAddressStore(mockBtcAddress);
				mockFeeRateStore(1000n);
				mockUtxosStore([]);

				const tokenWithNullMinFee = { ...baseToken, minFee: null } as unknown as PayableToken;

				const result = calculateBtcFee(tokenWithNullMinFee);

				expect(result).toBeDefined();
				expect(btcUtxosService.prepareBtcSend).toHaveBeenCalledWith({
					amount: '0.001',
					source: mockBtcAddress,
					allUtxos: [],
					feeRateMiliSatoshisPerVByte: 1000n
				});
			});

			it('should pass correct utxos to prepareBtcSend', () => {
				const mockUtxos = [{ value: 100000n }, { value: 200000n }] as BitcoinDid.utxo[];

				mockBtcAddressStore(mockBtcAddress);
				mockFeeRateStore(1000n);
				mockUtxosStore(mockUtxos);

				calculateBtcFee(baseToken);

				expect(btcUtxosService.prepareBtcSend).toHaveBeenCalledWith(
					expect.objectContaining({
						allUtxos: mockUtxos
					})
				);
			});

			it('should return the result from prepareBtcSend', () => {
				const expectedFee: UtxosFee = {
					feeSatoshis: 5000n,
					utxos: [{ value: 100000n }] as unknown as UtxosFee['utxos']
				};

				vi.spyOn(btcUtxosService, 'prepareBtcSend').mockReturnValue(expectedFee);

				mockBtcAddressStore(mockBtcAddress);
				mockFeeRateStore(1000n);
				mockUtxosStore([]);

				const result = calculateBtcFee(baseToken);

				expect(result).toEqual(expectedFee);
			});
		});
	});

	describe('payBtc', () => {
		const mockBtcAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
		const mockProgress = vi.fn();
		const mockTxid = 'abc123def456';

		const mockToken: PayableTokenWithConvertedAmount = {
			...BTC_MAINNET_TOKEN,
			tokenNetwork: 'Bitcoin',
			amount: '0.001',
			minFee: 0.0001,
			amountInUSD: 50,
			feeInUSD: 0.5,
			sumInUSD: 50.5,
			fee: {
				feeSatoshis: 1000n,
				utxos: []
			}
		};

		const mockValidatedData: ValidatedBtcPaymentData = {
			destination: 'bc1qbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
			satoshisAmount: 100000n,
			utxosFee: {
				feeSatoshis: 1000n,
				utxos: []
			}
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(addressDerived, 'btcAddressMainnet', 'get').mockReturnValue(
				readable(mockBtcAddress)
			);
			vi.mocked(btcSendServices.signBtc).mockResolvedValue({ txid: mockTxid });
			vi.mocked(fetchOpenCryptoPay).mockResolvedValue(undefined);
			vi.mocked(backendApi.addPendingBtcTransaction).mockResolvedValue(true);
		});

		it('should call signBtc with correct parameters', async () => {
			await payBtc({
				token: mockToken,
				identity: mockIdentity,
				validatedData: mockValidatedData,
				progress: mockProgress,
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			expect(btcSendServices.signBtc).toHaveBeenCalledWith({
				identity: mockIdentity,
				network: mockToken.network.env,
				utxosFee: mockValidatedData.utxosFee,
				amount: '100000',
				destination: mockValidatedData.destination,
				source: ''
			});
		});

		it('should call progress with PAY step after signing', async () => {
			await payBtc({
				token: mockToken,
				identity: mockIdentity,
				validatedData: mockValidatedData,
				progress: mockProgress,
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			expect(mockProgress).toHaveBeenCalledWith(ProgressStepsPayment.PAY);
		});

		it('should call fetchOpenCryptoPay with correct payment URI', async () => {
			await payBtc({
				token: mockToken,
				identity: mockIdentity,
				validatedData: mockValidatedData,
				progress: mockProgress,
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			expect(fetchOpenCryptoPay).toHaveBeenCalledWith(
				'https://api.dfx.swiss/v1/lnurlp/tx/pl_test?quote=quote-123&method=Bitcoin&hex='
			);
		});

		it('should add pending BTC transaction when address is available', async () => {
			await payBtc({
				token: mockToken,
				identity: mockIdentity,
				validatedData: mockValidatedData,
				progress: mockProgress,
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			expect(backendApi.addPendingBtcTransaction).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					address: mockBtcAddress,
					utxos: mockValidatedData.utxosFee.utxos
				})
			);
		});

		it('should not add pending BTC transaction when address is null', async () => {
			vi.spyOn(addressDerived, 'btcAddressMainnet', 'get').mockReturnValue(readable(null));

			await payBtc({
				token: mockToken,
				identity: mockIdentity,
				validatedData: mockValidatedData,
				progress: mockProgress,
				quoteId: 'quote-123',
				callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
			});

			expect(backendApi.addPendingBtcTransaction).not.toHaveBeenCalled();
		});

		it('should propagate errors from signBtc', async () => {
			vi.mocked(btcSendServices.signBtc).mockRejectedValue(new Error('Signing failed'));

			await expect(
				payBtc({
					token: mockToken,
					identity: mockIdentity,
					validatedData: mockValidatedData,
					progress: mockProgress,
					quoteId: 'quote-123',
					callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
				})
			).rejects.toThrowError('Signing failed');
		});

		it('should propagate errors from fetchOpenCryptoPay', async () => {
			vi.mocked(fetchOpenCryptoPay).mockRejectedValue(new Error('API request failed'));

			await expect(
				payBtc({
					token: mockToken,
					identity: mockIdentity,
					validatedData: mockValidatedData,
					progress: mockProgress,
					quoteId: 'quote-123',
					callback: 'https://api.dfx.swiss/v1/lnurlp/cb/pl_test'
				})
			).rejects.toThrowError('API request failed');
		});
	});
});
