import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import ConvertWizard from '$lib/components/convert/ConvertWizard.svelte';
import { ProgressStepsConvert } from '$lib/enums/progress-steps';
import { WizardStepsConvert } from '$lib/enums/wizard-steps';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import type { Token } from '$lib/types/token';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

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
		new Map([
			[
				CONVERT_CONTEXT_KEY,
				{
					sourceToken: readable(sourceToken),
					destinationToken: readable(ICP_TOKEN)
				}
			]
		]);

	it('should display BTC convert wizard if sourceToken network is BTC', () => {
		const { container } = render(ConvertWizard, {
			props,
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(container).toHaveTextContent(en.fee.text.convert_btc_network_fee);
	});

	it('should not have any content if sourceToken network wizard is not implemented yet', () => {
		const { container } = render(ConvertWizard, {
			props,
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(container).toHaveTextContent(en.convert.text.unsupported_token_conversion);
	});
});
