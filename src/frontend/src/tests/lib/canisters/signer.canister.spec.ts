import type {
	EthAddressResponse,
	EthSignTransactionRequest,
	RejectionCode_1,
	_SERVICE as SignerService
} from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { P2WPKH, SIGNER_PAYMENT_TYPE } from '$lib/canisters/signer.constants';
import { SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import type { SendBtcParams } from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockedAgent } from '$tests/mocks/agents.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { type ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { mock } from 'vitest-mock-extended';

vi.mock(import('$lib/constants/app.constants'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		LOCAL: false
	};
});

vi.mock(import('$lib/actors/agents.ic'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		// eslint-disable-next-line require-await
		getAgent: async () => mockedAgent
	};
});

describe('signer.canister', () => {
	const createSignerCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<SignerService>, 'serviceOverride'>): Promise<SignerCanister> =>
		SignerCanister.create({
			canisterId: Principal.fromText('tdxud-2yaaa-aaaad-aadiq-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});
	const service = mock<ActorSubclass<SignerService>>();
	const mockResponseError = new Error('Test response error');
	const btcParams = {
		network: { testnet: null }
	};
	const signTransactionParams = {
		transaction: {
			to: 'to',
			gas: 1n,
			value: 2n,
			max_priority_fee_per_gas: 1n,
			data: [],
			max_fee_per_gas: 5n,
			chain_id: 10n,
			nonce: 10n
		} as EthSignTransactionRequest
	};
	const personalSignParams = {
		message: 'message'
	};
	const signPrehashParams = {
		hash: 'hash'
	};
	const sendBtcParams = {
		feeSatoshis: [10n],
		network: { testnet: null },
		utxosToSpend: [
			{
				height: 1000,
				value: 1n,
				outpoint: {
					txid: [1, 2, 3],
					vout: 1
				}
			}
		],
		outputs: [
			{
				destination_address: 'test-address',
				sent_satoshis: 10n
			}
		]
	} as SendBtcParams;
	const internalErrorResponse = { Err: { InternalError: { msg: 'Test error' } } };

	// TODO: We should test the SignerCanisterPaymentError as currently there is no test that covers how all possible payment errors are parsed
	const paymentErrorResponse = { Err: { PaymentError: { UnsupportedPaymentType: null } } };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getBtcAddress', () => {
		it('returns correct BTC address', async () => {
			const address = 'test-bitcoin-address';
			const response = { Ok: { address } };
			service.btc_caller_address.mockResolvedValue(response);

			const { getBtcAddress } = await createSignerCanister({
				serviceOverride: service
			});

			const res = await getBtcAddress(btcParams);

			expect(res).toEqual(address);
			expect(service.btc_caller_address).toHaveBeenCalledWith(
				{ network: btcParams.network, address_type: P2WPKH },
				[SIGNER_PAYMENT_TYPE]
			);
		});

		it('should throw an error if btc_caller_address returns an internal error', async () => {
			service.btc_caller_address.mockResolvedValue(internalErrorResponse);

			const { getBtcAddress } = await createSignerCanister({
				serviceOverride: service
			});

			const res = getBtcAddress(btcParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(internalErrorResponse.Err.InternalError.msg)
			);
		});

		it('should throw an error if btc_caller_address returns a payment error', async () => {
			service.btc_caller_address.mockResolvedValue(paymentErrorResponse);

			const { getBtcAddress } = await createSignerCanister({
				serviceOverride: service
			});

			const res = getBtcAddress(btcParams);

			await expect(res).rejects.toThrow(
				new SignerCanisterPaymentError(paymentErrorResponse.Err.PaymentError)
			);
		});

		it('should throw an error if btc_caller_address throws', async () => {
			service.btc_caller_address.mockImplementation(() => {
				throw mockResponseError;
			});

			const { getBtcAddress } = await createSignerCanister({
				serviceOverride: service
			});

			const res = getBtcAddress(btcParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if btc_caller_address returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_caller_address.mockResolvedValue({ test: 'unexpected' });

			const { getBtcAddress } = await createSignerCanister({
				serviceOverride: service
			});

			const res = getBtcAddress(btcParams);

			await expect(res).rejects.toThrow();
		});
	});

	describe('getBtcBalance', () => {
		it('returns correct BTC balance', async () => {
			const balance = 2n;
			const response = { Ok: { balance } };
			service.btc_caller_balance.mockResolvedValue(response);

			const { getBtcBalance } = await createSignerCanister({
				serviceOverride: service
			});

			const res = await getBtcBalance(btcParams);

			expect(res).toEqual(balance);
			expect(service.btc_caller_balance).toHaveBeenCalledWith(
				{ network: btcParams.network, address_type: P2WPKH, min_confirmations: [] },
				[SIGNER_PAYMENT_TYPE]
			);
		});

		it('returns correct BTC balance with min_confirmations', async () => {
			const balance = 2n;
			const minConfirmations = 3;
			const response = { Ok: { balance } };
			service.btc_caller_balance.mockResolvedValue(response);

			const { getBtcBalance } = await createSignerCanister({
				serviceOverride: service
			});

			const res = await getBtcBalance({ ...btcParams, minConfirmations });

			expect(res).toEqual(balance);
			expect(service.btc_caller_balance).toHaveBeenCalledWith(
				{
					network: btcParams.network,
					address_type: P2WPKH,
					min_confirmations: [minConfirmations]
				},
				[SIGNER_PAYMENT_TYPE]
			);
		});

		it('should throw an error if btc_caller_balance returns an internal error', async () => {
			service.btc_caller_balance.mockResolvedValue(internalErrorResponse);

			const { getBtcBalance } = await createSignerCanister({
				serviceOverride: service
			});

			const res = getBtcBalance(btcParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(internalErrorResponse.Err.InternalError.msg)
			);
		});

		it('should throw an error if btc_caller_balance returns a payment error', async () => {
			service.btc_caller_balance.mockResolvedValue(paymentErrorResponse);

			const { getBtcBalance } = await createSignerCanister({
				serviceOverride: service
			});

			const res = getBtcBalance(btcParams);

			await expect(res).rejects.toThrow(
				new SignerCanisterPaymentError(paymentErrorResponse.Err.PaymentError)
			);
		});

		it('should throw an error if btc_caller_balance throws', async () => {
			service.btc_caller_balance.mockImplementation(() => {
				throw mockResponseError;
			});

			const { getBtcBalance } = await createSignerCanister({
				serviceOverride: service
			});

			const res = getBtcBalance(btcParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if btc_caller_balance returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_caller_balance.mockResolvedValue({ test: 'unexpected' });

			const { getBtcBalance } = await createSignerCanister({
				serviceOverride: service
			});

			const res = getBtcBalance(btcParams);

			await expect(res).rejects.toThrow();
		});
	});

	describe('getEthAddress', () => {
		const mockResponseAddress: EthAddressResponse = { address: mockEthAddress };

		it('returns correct ETH address', async () => {
			service.eth_address.mockResolvedValue({ Ok: mockResponseAddress });

			const { getEthAddress } = await createSignerCanister({
				serviceOverride: service
			});

			const res = await getEthAddress();

			expect(res).toEqual(mockResponseAddress.address);
		});

		it('should request a payment for the backend canister.', async () => {
			const spy = service.eth_address.mockResolvedValue({ Ok: mockResponseAddress });

			const { getEthAddress } = await createSignerCanister({
				serviceOverride: service
			});

			await getEthAddress();

			expect(spy).toHaveBeenNthCalledWith(1, { principal: [] }, [SIGNER_PAYMENT_TYPE]);
		});

		it('should throw an error if eth_address throws', async () => {
			service.eth_address.mockImplementation(() => {
				throw mockResponseError;
			});

			const { getEthAddress } = await createSignerCanister({
				serviceOverride: service
			});

			await expect(getEthAddress()).rejects.toThrow(mockResponseError);
		});

		const signingErrors = [
			'NoError',
			'CanisterError',
			'SysTransient',
			'DestinationInvalid',
			'Unknown',
			'SysFatal',
			'CanisterReject'
		];

		it.each(signingErrors)(
			'should throw an error if eth_address throws a SigningError for %s',
			async (error) => {
				const rejectionCode: RejectionCode_1 = {
					[`${error}`]: null
				} as RejectionCode_1;

				const addOns = 'test';

				const SigningError: [RejectionCode_1, string] = [rejectionCode, addOns];
				const response = { SigningError };

				service.eth_address.mockResolvedValue({ Err: response });

				const { getEthAddress } = await createSignerCanister({
					serviceOverride: service
				});

				await expect(getEthAddress()).rejects.toThrow(
					new CanisterInternalError(`Signing error: ${JSON.stringify(rejectionCode)} ${addOns}`)
				);
			}
		);

		it('should throw a SignerCanisterPaymentError for UnsupportedPaymentType error', async () => {
			service.eth_address.mockResolvedValue(paymentErrorResponse);

			const { getEthAddress } = await createSignerCanister({
				serviceOverride: service
			});

			await expect(getEthAddress()).rejects.toThrow(
				new SignerCanisterPaymentError(paymentErrorResponse.Err.PaymentError)
			);
		});

		it('should throw an error if eth_address returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.eth_address.mockResolvedValue({ test: 'unexpected' });

			const { getEthAddress } = await createSignerCanister({
				serviceOverride: service
			});

			const res = getEthAddress();

			await expect(res).rejects.toThrow();
		});
	});

	describe('signTransaction', () => {
		it('signs eth transaction', async () => {
			const response = 'signed-transaction';
			service.eth_sign_transaction.mockResolvedValue({ Ok: { signature: response } });

			const { signTransaction } = await createSignerCanister({
				serviceOverride: service
			});

			const res = await signTransaction(signTransactionParams);

			expect(res).toEqual(response);
			expect(service.eth_sign_transaction).toHaveBeenCalledWith(signTransactionParams.transaction, [
				SIGNER_PAYMENT_TYPE
			]);
		});

		it('should throw an error if eth_sign_transaction throws', async () => {
			service.eth_sign_transaction.mockImplementation(() => {
				throw mockResponseError;
			});

			const { signTransaction } = await createSignerCanister({
				serviceOverride: service
			});

			const res = signTransaction(signTransactionParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if eth_sign_transaction returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.eth_sign_transaction.mockResolvedValue({ test: 'unexpected' });

			const { signTransaction } = await createSignerCanister({
				serviceOverride: service
			});

			const res = signTransaction(signTransactionParams);

			await expect(res).rejects.toThrow();
		});
	});

	describe('personalSign', () => {
		it('calls personal sign', async () => {
			const response = 'personal-sign';
			service.eth_personal_sign.mockResolvedValue({ Ok: { signature: response } });

			const { personalSign } = await createSignerCanister({
				serviceOverride: service
			});

			const res = await personalSign(personalSignParams);

			expect(res).toEqual(response);
			expect(service.eth_personal_sign).toHaveBeenCalledWith(personalSignParams, [
				SIGNER_PAYMENT_TYPE
			]);
		});

		it('should throw an error if eth_personal_sign throws', async () => {
			service.eth_personal_sign.mockImplementation(() => {
				throw mockResponseError;
			});

			const { personalSign } = await createSignerCanister({
				serviceOverride: service
			});

			const res = personalSign(personalSignParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if eth_personal_sign returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.eth_personal_sign.mockResolvedValue({ test: 'unexpected' });

			const { personalSign } = await createSignerCanister({
				serviceOverride: service
			});

			const res = personalSign(personalSignParams);

			await expect(res).rejects.toThrow();
		});
	});

	describe('signPrehash', () => {
		it('signs prehash', async () => {
			const response = 'personal-sign';
			service.eth_sign_prehash.mockResolvedValue({ Ok: { signature: response } });

			const { signPrehash } = await createSignerCanister({
				serviceOverride: service
			});

			const res = await signPrehash(signPrehashParams);

			expect(res).toEqual(response);
			expect(service.eth_sign_prehash).toHaveBeenCalledWith(signPrehashParams, [
				SIGNER_PAYMENT_TYPE
			]);
		});

		it('should throw an error if eth_sign_prehash throws', async () => {
			service.eth_sign_prehash.mockImplementation(() => {
				throw mockResponseError;
			});

			const { signPrehash } = await createSignerCanister({
				serviceOverride: service
			});

			const res = signPrehash(signPrehashParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if eth_sign_prehash returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.eth_sign_prehash.mockResolvedValue({ test: 'unexpected' });

			const { signPrehash } = await createSignerCanister({
				serviceOverride: service
			});

			const res = signPrehash(signPrehashParams);

			await expect(res).rejects.toThrow();
		});
	});

	describe('btc_caller_send', () => {
		it('sends BTC correctly', async () => {
			const response = { Ok: { txid: '1' } };
			service.btc_caller_send.mockResolvedValue(response);

			const { sendBtc } = await createSignerCanister({
				serviceOverride: service
			});

			const res = await sendBtc(sendBtcParams);

			expect(res).toEqual(response.Ok);
			expect(service.btc_caller_send).toHaveBeenCalledWith(
				{
					fee_satoshis: sendBtcParams.feeSatoshis,
					network: sendBtcParams.network,
					utxos_to_spend: sendBtcParams.utxosToSpend,
					address_type: P2WPKH,
					outputs: sendBtcParams.outputs
				},
				[SIGNER_PAYMENT_TYPE]
			);
		});

		it('should throw an error if btc_caller_send returns an internal error', async () => {
			service.btc_caller_send.mockResolvedValue(internalErrorResponse);

			const { sendBtc } = await createSignerCanister({
				serviceOverride: service
			});

			const res = sendBtc(sendBtcParams);

			await expect(res).rejects.toThrow(
				new CanisterInternalError(internalErrorResponse.Err.InternalError.msg)
			);
		});

		it('should throw an error if btc_caller_send returns a payment error', async () => {
			service.btc_caller_send.mockResolvedValue(paymentErrorResponse);

			const { sendBtc } = await createSignerCanister({
				serviceOverride: service
			});

			const res = sendBtc(sendBtcParams);

			await expect(res).rejects.toThrow(
				new SignerCanisterPaymentError(paymentErrorResponse.Err.PaymentError)
			);
		});

		it('should throw an error if btc_caller_send throws', async () => {
			service.btc_caller_send.mockImplementation(() => {
				throw mockResponseError;
			});

			const { sendBtc } = await createSignerCanister({
				serviceOverride: service
			});

			const res = sendBtc(sendBtcParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if btc_caller_send returns an unexpected response', async () => {
			// @ts-expect-error we test this in purposes
			service.btc_caller_send.mockResolvedValue({ test: 'unexpected' });

			const { sendBtc } = await createSignerCanister({
				serviceOverride: service
			});

			const res = sendBtc(sendBtcParams);

			await expect(res).rejects.toThrow();
		});
	});
});
