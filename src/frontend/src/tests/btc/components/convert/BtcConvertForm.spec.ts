import BtcConvertForm from '$btc/components/convert/BtcConvertForm.svelte';
import * as btcPendingSendTransactionsStatusStore from '$btc/derived/btc-pending-sent-transactions-status.derived';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import {
	UTXOS_FEE_CONTEXT_KEY,
	initUtxosFeeStore,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import { TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY } from '$lib/stores/token-action-validation-errors.store';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('BtcConvertForm', () => {
	let store: UtxosFeeStore;
	const mockContext = ({
		utxosFeeStore,
		sourceTokenBalance = 1000000n
	}: {
		utxosFeeStore: UtxosFeeStore;
		sourceTokenBalance?: bigint;
	}) =>
		new Map([
			[UTXOS_FEE_CONTEXT_KEY, { store: utxosFeeStore }],
			[
				CONVERT_CONTEXT_KEY,
				{
					sourceToken: readable(BTC_MAINNET_TOKEN),
					sourceTokenBalance: readable(sourceTokenBalance),
					destinationToken: readable(ICP_TOKEN)
				}
			],
			[
				TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
				{
					setErrorType: () => {}
				}
			]
		]);
	const props = {
		source: mockBtcAddress,
		sendAmount: 0.001,
		receiveAmount: 0.001,
		onNext: vi.fn(),
		cancel: mockSnippet
	};
	const mockBtcPendingSendTransactionsStatusStore = (
		status:
			| btcPendingSendTransactionsStatusStore.BtcPendingSentTransactionsStatus
			| undefined = btcPendingSendTransactionsStatusStore.BtcPendingSentTransactionsStatus.NONE
	) =>
		vi
			.spyOn(btcPendingSendTransactionsStatusStore, 'initPendingSentTransactionsStatus')
			.mockImplementation(() => readable(status));

	const buttonTestId = 'convert-form-button-next';

	beforeEach(() => {
		mockPage.reset();
		store = initUtxosFeeStore();
		store.reset();

		allUtxosStore.reset();
		feeRatePercentilesStore.reset();
		btcPendingSentTransactionsStore.reset();
	});

	it('should keep the next button clickable if all requirements are met', () => {
		store.setUtxosFee({ utxosFee: mockUtxosFee });
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcConvertForm, {
			props,
			context: mockContext({ utxosFeeStore: store })
		});

		expect(getByTestId(buttonTestId)).not.toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if amount is undefined', () => {
		store.setUtxosFee({ utxosFee: mockUtxosFee });
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcConvertForm, {
			props: {
				...props,
				sendAmount: undefined
			},
			context: mockContext({ utxosFeeStore: store })
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if amount is invalid', () => {
		store.setUtxosFee({ utxosFee: mockUtxosFee });
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcConvertForm, {
			props: {
				...props,
				sendAmount: -1
			},
			context: mockContext({ utxosFeeStore: store })
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if utxos are undefined', () => {
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcConvertForm, {
			props,
			context: mockContext({ utxosFeeStore: store })
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should keep the next button disabled if utxos are not available', () => {
		store.setUtxosFee({ utxosFee: { ...mockUtxosFee, utxos: [] } });
		mockBtcPendingSendTransactionsStatusStore();

		const { getByTestId } = render(BtcConvertForm, {
			props,
			context: mockContext({ utxosFeeStore: store })
		});

		expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
	});

	it('should keep button clickable and not render pending warning when there are pending txs', async () => {
		// With multi-send enabled, a previous unconfirmed send no longer blocks
		// the convert button or surfaces the "wait for the previous send" warning.
		store.setUtxosFee({ utxosFee: mockUtxosFee });
		mockBtcPendingSendTransactionsStatusStore(
			btcPendingSendTransactionsStatusStore.BtcPendingSentTransactionsStatus.SOME
		);

		const { getByTestId, queryByText } = render(BtcConvertForm, {
			props,
			context: mockContext({ utxosFeeStore: store })
		});

		await waitFor(() => {
			expect(queryByText(en.send.info.pending_bitcoin_transaction)).toBeNull();
			expect(getByTestId(buttonTestId)).not.toHaveAttribute('disabled');
		});
	});

	it('should keep button clickable even while pending txs are still loading', async () => {
		store.setUtxosFee({ utxosFee: mockUtxosFee });
		mockBtcPendingSendTransactionsStatusStore(
			btcPendingSendTransactionsStatusStore.BtcPendingSentTransactionsStatus.LOADING
		);

		const { getByTestId } = render(BtcConvertForm, {
			props,
			context: mockContext({ utxosFeeStore: store })
		});

		await waitFor(() => {
			expect(getByTestId(buttonTestId)).not.toHaveAttribute('disabled');
		});
	});
});
