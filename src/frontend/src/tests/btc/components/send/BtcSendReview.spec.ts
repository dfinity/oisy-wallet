import BtcSendReview from '$btc/components/send/BtcSendReview.svelte';
import * as btcPendingSendTransactionsStatusStore from '$btc/derived/btc-pending-sent-transactions-status.derived';
import { BtcPrepareSendError } from '$btc/types/btc-send';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
import { SEND_CONTEXT_KEY } from '$lib/stores/send.store';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('BtcSendReview', () => {
	const defaultBalance = 1000000n;
	const mockContext = (balance: bigint | undefined = defaultBalance) =>
		new Map([
			[
				SEND_CONTEXT_KEY,
				{
					sendToken: readable(BTC_MAINNET_TOKEN),
					sendTokenDecimals: readable(BTC_MAINNET_TOKEN.decimals),
					sendTokenId: readable(BTC_MAINNET_TOKEN.id),
					sendTokenStandard: readable(BTC_MAINNET_TOKEN.standard),
					sendTokenSymbol: readable(BTC_MAINNET_TOKEN.symbol),
					sendBalance: readable(balance)
				}
			]
		]);
	const props = {
		destination: mockBtcAddress,
		source: mockBtcAddress,
		amount: 0.0001,
		networkId: BTC_MAINNET_TOKEN.network.id,
		utxosFee: mockUtxosFee
	};
	const mockBtcPendingSendTransactionsStatusStore = (
		status:
			| btcPendingSendTransactionsStatusStore.BtcPendingSentTransactionsStatus
			| undefined = btcPendingSendTransactionsStatusStore.BtcPendingSentTransactionsStatus.NONE
	) =>
		vi
			.spyOn(btcPendingSendTransactionsStatusStore, 'initPendingSentTransactionsStatus')
			.mockImplementation(() => readable(status));

	const buttonTestId = REVIEW_FORM_SEND_BUTTON;
	const insufficientFundsForFeeTestId = 'btc-send-form-insufficient-funds-for-fee';

	beforeEach(() => {
		mockPage.reset();
	});

	it('should enable the next button if all requirements are met', () => {
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcSendReview, {
			props,
			context: mockContext()
		});

		expect(getByTestId(buttonTestId)).not.toHaveAttribute('disabled');
	});

	it('should disable the next button if amount is undefined', () => {
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcSendReview, {
			props: {
				...props,
				amount: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should disable the next button if amount is invalid', () => {
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcSendReview, {
			props: {
				...props,
				amount: -1
			},
			context: mockContext()
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should disable the next button if utxos are undefined', () => {
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcSendReview, {
			props: {
				...props,
				utxosFee: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should disable the next button if utxosFee has an error', () => {
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcSendReview, {
			props: {
				...props,
				utxosFee: {
					...mockUtxosFee,
					error: BtcPrepareSendError.InsufficientBalance
				}
			},
			context: mockContext()
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should disable the next button and render insufficient funds for fee message', () => {
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcSendReview, {
			props: {
				...props,
				utxosFee: {
					...mockUtxosFee,
					error: BtcPrepareSendError.InsufficientBalanceForFee
				}
			},
			context: mockContext()
		});

		expect(getByTestId(insufficientFundsForFeeTestId)).toHaveTextContent(
			en.fee.assertion.insufficient_funds_for_fee
		);
		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});
});
