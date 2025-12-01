import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtUnstakeWizard from '$icp/components/stake/gldt/GldtUnstakeWizard.svelte';
import * as gldtStakeService from '$icp/services/gldt-stake.services';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import {
	STAKE_FORM_REVIEW_BUTTON,
	STAKE_REVIEW_FORM_BUTTON
} from '$lib/constants/test-ids.constants';
import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('GldtUnstakeWizard', () => {
	const mockContext = () =>
		new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
		]);

	const props = {
		amount: 0.001,
		unstakeProgressStep: 'test',
		onClose: () => {},
		onBack: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(gldtStakeService, 'unstakeGldt').mockResolvedValueOnce(stakePositionMockResponse);
	});

	it('should render unstake form if currentStep is UNSTAKE', () => {
		const { getByTestId } = render(GldtUnstakeWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsUnstake.UNSTAKE,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toBeInTheDocument();
	});

	it('should render review form if currentStep is REVIEW', () => {
		const { getByTestId } = render(GldtUnstakeWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsUnstake.REVIEW,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toBeInTheDocument();
	});

	it('should render unstake progress if currentStep is UNSTAKING', () => {
		const { container } = render(GldtUnstakeWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsUnstake.UNSTAKING,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.core.warning.do_not_close);
	});

	it('should call unstakeGldt if conditions met', async () => {
		mockAuthStore();

		const { getByTestId } = render(GldtUnstakeWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsUnstake.REVIEW,
					title: 'test'
				}
			},
			context: mockContext()
		});

		const button = getByTestId(STAKE_REVIEW_FORM_BUTTON);

		await fireEvent.click(button);

		expect(gldtStakeService.unstakeGldt).toHaveBeenCalledOnce();
	});

	it('should not call unstakeGldt if identity is not available', async () => {
		const { getByTestId } = render(GldtUnstakeWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsUnstake.REVIEW,
					title: 'test'
				}
			},
			context: mockContext()
		});

		const button = getByTestId(STAKE_REVIEW_FORM_BUTTON);

		await fireEvent.click(button);

		expect(gldtStakeService.unstakeGldt).not.toHaveBeenCalledOnce();
	});
});
