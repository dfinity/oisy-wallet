import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtStakeWizard from '$icp/components/stake/gldt/GldtStakeWizard.svelte';
import {
	STAKE_FORM_REVIEW_BUTTON,
	STAKE_REVIEW_FORM_BUTTON
} from '$lib/constants/test-ids.constants';
import { WizardStepsStake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('GldtStakeWizard', () => {
	const mockContext = () =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })]]);

	const props = {
		amount: 0.001,
		stakeProgressStep: 'test',
		onClose: () => {},
		onBack: () => {},
		onNext: () => {}
	};

	it('should render stake form if currentStep is STAKE', () => {
		const { getByTestId } = render(GldtStakeWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsStake.STAKE,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toBeInTheDocument();
	});

	it('should render review form if currentStep is REVIEW', () => {
		const { getByTestId } = render(GldtStakeWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsStake.REVIEW,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toBeInTheDocument();
	});

	it('should render stake progress if currentStep is STAKING', () => {
		const { container } = render(GldtStakeWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsStake.STAKING,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.core.warning.do_not_close);
	});
});
