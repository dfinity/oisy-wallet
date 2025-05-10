import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import HowToConvertEthereumWizardSteps from '$icp/components/convert/HowToConvertEthereumWizardSteps.svelte';
import {
	HOW_TO_CONVERT_ETHEREUM_INFO,
	HOW_TO_CONVERT_ETHEREUM_QR_CODE
} from '$lib/constants/test-ids.constants';
import { WizardStepsHowToConvert } from '$lib/enums/wizard-steps';
import {
	CONVERT_CONTEXT_KEY,
	initConvertContext,
	type ConvertContext
} from '$lib/stores/convert.store';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('HowToConvertEthereumWizardSteps', () => {
	const mockContext = () =>
		new Map<symbol, ConvertContext>([
			[
				CONVERT_CONTEXT_KEY,
				initConvertContext({
					sourceToken: mockValidIcCkToken,
					destinationToken: ICP_TOKEN
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

	it('should render ReceiveAddressQrCode if current step is info', () => {
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
