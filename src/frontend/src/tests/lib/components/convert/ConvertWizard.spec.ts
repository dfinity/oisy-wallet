import * as btcPendingSentTransactionsServices from '$btc/services/btc-pending-sent-transactions.services';
import * as btcUtxosService from '$btc/services/btc-utxos.service';
import { allUtxosStore } from '$btc/stores/all-utxos.store';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import { feeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import {
	UTXOS_FEE_CONTEXT_KEY,
	initUtxosFeeStore,
	type UtxosFeeContext
} from '$btc/stores/utxos-fee.store';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	ETH_FEE_CONTEXT_KEY,
	initEthFeeContext,
	initEthFeeStore,
	type EthFeeContext
} from '$eth/stores/eth-fee.store';
import * as bitcoinApi from '$icp/api/bitcoin.api';
import ConvertWizard from '$lib/components/convert/ConvertWizard.svelte';
import {
	BTC_CONVERT_FORM_TEST_ID,
	ETH_CONVERT_FORM_TEST_ID,
	IC_CONVERT_FORM_TEST_ID
} from '$lib/constants/test-ids.constants';
import { ProgressStepsConvert } from '$lib/enums/progress-steps';
import { WizardStepsConvert } from '$lib/enums/wizard-steps';
import {
	CONVERT_CONTEXT_KEY,
	initConvertContext,
	type ConvertContext
} from '$lib/stores/convert.store';
import {
	TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
	initTokenActionValidationErrorsContext,
	type TokenActionValidationErrorsContext
} from '$lib/stores/token-action-validation-errors.store';
import type { Token } from '$lib/types/token';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';

vi.mock('$eth/providers/alchemy.providers', () => ({
	initMinedTransactionsListener: () => ({
		disconnect: async () => {}
	})
}));

describe('ConvertWizard', () => {
	const sendAmount = 20;

	const onBack = vi.fn();
	const onClose = vi.fn();
	const onNext = vi.fn();
	const onDestination = vi.fn();
	const onDestinationBack = vi.fn();
	const onQRCodeScan = vi.fn();
	const onQRCodeBack = vi.fn();

	const props = {
		sendAmount,
		receiveAmount: sendAmount,
		convertProgressStep: ProgressStepsConvert.INITIALIZATION,
		currentStep: {
			name: WizardStepsConvert.CONVERT,
			title: 'title'
		},
		onBack,
		onClose,
		onNext,
		onDestination,
		onDestinationBack,
		onQRCodeBack,
		onQRCodeScan
	};

	const mockContext = (sourceToken: Token) =>
		new Map<
			symbol,
			UtxosFeeContext | EthFeeContext | ConvertContext | TokenActionValidationErrorsContext
		>([
			[UTXOS_FEE_CONTEXT_KEY, { store: initUtxosFeeStore() }],
			[
				ETH_FEE_CONTEXT_KEY,
				initEthFeeContext({
					feeStore: initEthFeeStore(),
					feeTokenIdStore: writable(sourceToken.id),
					feeExchangeRateStore: writable(100),
					feeSymbolStore: writable(sourceToken.symbol),
					feeDecimalsStore: writable(sourceToken.decimals)
				})
			],
			[CONVERT_CONTEXT_KEY, initConvertContext({ sourceToken, destinationToken: ICP_TOKEN })],
			[TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY, initTokenActionValidationErrorsContext()]
		]);

	beforeEach(() => {
		vi.clearAllMocks();

		allUtxosStore.reset();
		feeRatePercentilesStore.reset();
		btcPendingSentTransactionsStore.reset();

		vi.spyOn(bitcoinApi, 'getUtxosQuery').mockResolvedValue({
			utxos: [],
			tip_block_hash: new Uint8Array(),
			tip_height: 100,
			next_page: []
		});
		vi.spyOn(btcUtxosService, 'getFeeRateFromPercentiles').mockResolvedValue(1000n);
		vi.spyOn(
			btcPendingSentTransactionsServices,
			'loadBtcPendingSentTransactions'
		).mockResolvedValue({ success: true });

		mockPage.reset();
	});

	it('should display BTC convert wizard if sourceToken network is BTC', () => {
		const { getByTestId } = render(ConvertWizard, {
			props,
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(getByTestId(BTC_CONVERT_FORM_TEST_ID)).toBeInTheDocument();
	});

	it('should display ETH convert wizard if sourceToken network is ETH', () => {
		mockPage.mockNetwork(ETHEREUM_NETWORK_ID.description);

		const { getByTestId } = render(ConvertWizard, {
			props,
			context: mockContext(SEPOLIA_TOKEN)
		});

		expect(getByTestId(ETH_CONVERT_FORM_TEST_ID)).toBeInTheDocument();
	});

	it('should display IC convert wizard if sourceToken network is IC', () => {
		const { getByTestId } = render(ConvertWizard, {
			props,
			context: mockContext(mockValidIcCkToken)
		});

		expect(getByTestId(IC_CONVERT_FORM_TEST_ID)).toBeInTheDocument();
	});

	it('should not have any content if sourceToken network wizard is not implemented yet', () => {
		const { container } = render(ConvertWizard, {
			props,
			context: mockContext(BONK_TOKEN)
		});

		expect(container).toHaveTextContent(en.convert.text.unsupported_token_conversion);
	});
});
