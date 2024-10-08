import type {
	RejectionCode_1,
	SignRequest,
	_SERVICE as SignerService
} from '$declarations/signer/signer.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { SignerCanisterPaymentError } from '$lib/canisters/signer.errors';
import type { SendBtcParams } from '$lib/types/api';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { type ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { describe } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { mockIdentity } from '../../mocks/identity.mock';

vi.mock(import('$lib/constants/app.constants'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		LOCAL: false
	};
});

describe('signer.canister', () => {
	const createSignerCanister = async ({
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
		network: { mainnet: null }
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
		} as SignRequest
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
		addressType: { P2WPKH: null },
		outputs: [
			{
				destination_address: 'test-address',
				sent_satoshis: 10n
			}
		]
	} as SendBtcParams;
	const internalErrorResponse = { Err: { InternalError: { msg: 'Test error' } } };
	const paymentErrorResponse = { Err: { PaymentError: { UnsupportedPaymentType: null } } };

	beforeEach(() => {
		vi.clearAllMocks();
	});

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
			{ network: btcParams.network, address_type: { P2WPKH: null } },
			[]
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
		service.btc_caller_address.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { getBtcAddress } = await createSignerCanister({
			serviceOverride: service
		});

		const res = getBtcAddress(btcParams);

		await expect(res).rejects.toThrow(mockResponseError);
	});

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
			{ network: btcParams.network, address_type: { P2WPKH: null } },
			[]
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
		service.btc_caller_balance.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { getBtcBalance } = await createSignerCanister({
			serviceOverride: service
		});

		const res = getBtcBalance(btcParams);

		await expect(res).rejects.toThrow(mockResponseError);
	});

	describe('getEthAddress', () => {
		const mockEthAddress = '0x1d638414860ed08dd31fae848e527264f20512fa75d7d63cea9bbb372f020000';

		it('returns correct ETH address', async () => {
			const response = mockEthAddress;
			service.eth_address_of_caller.mockResolvedValue({ Ok: response });

			const { getEthAddress } = await createSignerCanister({
				serviceOverride: service
			});

			const res = await getEthAddress();

			expect(res).toEqual(response);
		});

		it('should throw an error if eth_address_of_caller throws', async () => {
			service.eth_address_of_caller.mockImplementation(async () => {
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
			'should throw an error if eth_address_of_caller throws a SigningError for %s',
			async (error) => {
				const rejectionCode: RejectionCode_1 = {
					[`${error}`]: null
				} as RejectionCode_1;

				const addOns = 'test';

				const SigningError: [RejectionCode_1, string] = [rejectionCode, addOns];
				const response = { SigningError };

				service.eth_address_of_caller.mockResolvedValue({ Err: response });

				const { getEthAddress } = await createSignerCanister({
					serviceOverride: service
				});

				await expect(getEthAddress()).rejects.toThrow(
					new CanisterInternalError(`Signing error: ${JSON.stringify(rejectionCode)} ${addOns}`)
				);
			}
		);
	});

	it('signs transaction', async () => {
		const response = 'signed-transaction';
		service.sign_transaction.mockResolvedValue(response);

		const { signTransaction } = await createSignerCanister({
			serviceOverride: service
		});

		const res = await signTransaction(signTransactionParams);

		expect(res).toEqual(response);
		expect(service.sign_transaction).toHaveBeenCalledWith(signTransactionParams.transaction);
	});

	it('should throw an error if sign_transaction throws', async () => {
		service.sign_transaction.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { signTransaction } = await createSignerCanister({
			serviceOverride: service
		});

		const res = signTransaction(signTransactionParams);

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('calls personal sign', async () => {
		const response = 'personal-sign';
		service.personal_sign.mockResolvedValue(response);

		const { personalSign } = await createSignerCanister({
			serviceOverride: service
		});

		const res = await personalSign(personalSignParams);

		expect(res).toEqual(response);
		expect(service.personal_sign).toHaveBeenCalledWith(personalSignParams.message);
	});

	it('should throw an error if personal_sign throws', async () => {
		service.personal_sign.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { personalSign } = await createSignerCanister({
			serviceOverride: service
		});

		const res = personalSign(personalSignParams);

		await expect(res).rejects.toThrow(mockResponseError);
	});

	it('signs prehash', async () => {
		const response = 'personal-sign';
		service.sign_prehash.mockResolvedValue(response);

		const { signPrehash } = await createSignerCanister({
			serviceOverride: service
		});

		const res = await signPrehash(signPrehashParams);

		expect(res).toEqual(response);
		expect(service.sign_prehash).toHaveBeenCalledWith(signPrehashParams.hash);
	});

	it('should throw an error if sign_prehash throws', async () => {
		service.sign_prehash.mockImplementation(async () => {
			throw mockResponseError;
		});

		const { signPrehash } = await createSignerCanister({
			serviceOverride: service
		});

		const res = signPrehash(signPrehashParams);

		await expect(res).rejects.toThrow(mockResponseError);
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
					address_type: sendBtcParams.addressType,
					outputs: sendBtcParams.outputs
				},
				[]
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
			service.btc_caller_send.mockImplementation(async () => {
				throw mockResponseError;
			});

			const { sendBtc } = await createSignerCanister({
				serviceOverride: service
			});

			const res = sendBtc(sendBtcParams);

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});
});
