import BtcConvertForm from '$btc/components/convert/BtcConvertForm.svelte';
import * as btcPendingSendTransactionsStatusStore from '$btc/derived/btc-pending-sent-transactions-status.derived';
import {
	initUtxosFeeStore,
	UTXOS_FEE_CONTEXT_KEY,
	type UtxosFeeStore
} from '$btc/stores/utxos-fee.store';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import { TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY } from '$lib/stores/token-action-validation-errors.store';
import { mockBtcAddress, mockUtxosFee } from '$tests/mocks/btc.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
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
		receiveAmount: 0.001
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
	const btcSendWarningsTestId = 'btc-convert-form-send-warnings';

	beforeEach(() => {
		mockPage.reset();
		store = initUtxosFeeStore();
		store.reset();
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

	it('should render btc send warning message and keep button disabled if there some pending txs', async () => {
		mockBtcPendingSendTransactionsStatusStore(
			btcPendingSendTransactionsStatusStore.BtcPendingSentTransactionsStatus.SOME
		);

		const { getByTestId } = render(BtcConvertForm, {
			props,
			context: mockContext({ utxosFeeStore: store })
		});

		await waitFor(() => {
			expect(getByTestId(btcSendWarningsTestId)).toHaveTextContent(
				en.send.info.pending_bitcoin_transaction
			);

			expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
		});
	});

	it('should keep button disabled if there pending txs have not been loaded yet', async () => {
		mockBtcPendingSendTransactionsStatusStore(
			btcPendingSendTransactionsStatusStore.BtcPendingSentTransactionsStatus.LOADING
		);

		const { getByTestId } = render(BtcConvertForm, {
			props,
			context: mockContext({ utxosFeeStore: store })
		});

		await waitFor(() => {
			expect(getByTestId(buttonTestId)).toHaveAttribute('disabled');
		});
	});
});
