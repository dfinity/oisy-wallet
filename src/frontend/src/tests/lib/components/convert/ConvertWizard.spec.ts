import {
	initUtxosFeeStore,
	UTXOS_FEE_CONTEXT_KEY,
	type UtxosFeeContext
} from '$btc/stores/utxos-fee.store';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
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
import { render } from '@testing-library/svelte';

describe('ConvertWizard', () => {
	const sendAmount = 20;

	const props = {
		sendAmount,
		receiveAmount: sendAmount,
		convertProgressStep: ProgressStepsConvert.INITIALIZATION,
		currentStep: {
			name: WizardStepsConvert.CONVERT,
			title: 'title'
		}
	};

	const mockContext = (sourceToken: Token) =>
		new Map<symbol, ConvertContext | TokenActionValidationErrorsContext | UtxosFeeContext>([
			[UTXOS_FEE_CONTEXT_KEY, { store: initUtxosFeeStore() }],
			[CONVERT_CONTEXT_KEY, initConvertContext({ sourceToken, destinationToken: ICP_TOKEN })],
			[TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY, initTokenActionValidationErrorsContext()]
		]);

	it('should display BTC convert wizard if sourceToken network is BTC', () => {
		const { getByTestId } = render(ConvertWizard, {
			props,
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(getByTestId(BTC_CONVERT_FORM_TEST_ID)).toBeInTheDocument();
	});

	it('should display ETH convert wizard if sourceToken network is ETH', () => {
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
