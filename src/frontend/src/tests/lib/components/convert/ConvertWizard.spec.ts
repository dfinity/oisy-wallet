import {
	initUtxosFeeStore,
	UTXOS_FEE_CONTEXT_KEY,
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
	initTokenActionValidationErrorsContext,
	TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
	type TokenActionValidationErrorsContext
} from '$lib/stores/token-action-validation-errors.store';
import type { Token } from '$lib/types/token';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { mockSnippet } from '$tests/mocks/snippet.mock';

vi.mock('$lib/services/auth.services', () => ({
	nullishSignOut: vi.fn()
}));

describe('ConvertWizard', () => {
	const sendAmount = 20;

	const onBack=vi.fn()
	const onClose=vi.fn()
	const onNext=vi.fn()
	const onDestination=vi.fn()
	const onDestinationBack=vi.fn()
	const onIcQrCodeScan=vi.fn()
	const onIcQrCodeBack=vi.fn()

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
		onDestination, onDestinationBack,
		onIcQrCodeBack,
		onIcQrCodeScan,
	};

	const mockContext = (sourceToken: Token) =>
		new Map<
			symbol,
			ConvertContext | TokenActionValidationErrorsContext | UtxosFeeContext | EthFeeContext
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
		mockPage.mock({ network: ETHEREUM_NETWORK_ID.description });

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
