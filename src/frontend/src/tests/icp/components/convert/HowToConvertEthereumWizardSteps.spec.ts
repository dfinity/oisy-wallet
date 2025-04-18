import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import HowToConvertEthereumWizardSteps from '$icp/components/convert/HowToConvertEthereumWizardSteps.svelte';
import {
	HOW_TO_CONVERT_ETHEREUM_INFO,
	HOW_TO_CONVERT_ETHEREUM_QR_CODE
} from '$lib/constants/test-ids.constants';
import { WizardStepsHowToConvert } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { render } from '@testing-library/svelte';

describe('HowToConvertEthereumWizardSteps', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([
			[
				SEND_CONTEXT_KEY,
				initSendContext({
					sendPurpose: 'convert-eth-to-cketh',
					token: ETHEREUM_TOKEN
				})
			]
		]);

	it('should render HowToConvertEthereumInfo if current step is info', () => {
		const { getByTestId } = render(HowToConvertEthereumWizardSteps, {
			props: {
				currentStep: {
					name: WizardStepsHowToConvert.INFO,
					title: 'INFO'
				}
			},
			context: mockContext()
		});

		expect(getByTestId(HOW_TO_CONVERT_ETHEREUM_INFO)).toBeInTheDocument();
	});

	it('should render ReceiveAddressQRCode if current step is info', () => {
		const { getByTestId } = render(HowToConvertEthereumWizardSteps, {
			props: {
				currentStep: {
					name: WizardStepsHowToConvert.ETH_QR_CODE,
					title: 'ETH QR CODE'
				}
			},
			context: mockContext()
		});

		expect(getByTestId(HOW_TO_CONVERT_ETHEREUM_QR_CODE)).toBeInTheDocument();
	});
});
