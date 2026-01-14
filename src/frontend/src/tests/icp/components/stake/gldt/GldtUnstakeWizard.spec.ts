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
import * as toastsStore from '$lib/stores/toasts.store';
import { GldtUnstakeDissolvementsLimitReached } from '$lib/types/errors';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { configMockResponse, stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('GldtUnstakeWizard', () => {
	const mockContext = () => {
		const store = initGldtStakeStore();
		store.setConfig(configMockResponse);

		return new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store }]
		]);
	};

	const props = {
		amount: 0.001,
		unstakeProgressStep: 'test',
		onClose: () => {},
		onBack: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		vi.resetAllMocks();
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
		vi.spyOn(gldtStakeService, 'unstakeGldt').mockResolvedValueOnce(stakePositionMockResponse);
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
		vi.spyOn(gldtStakeService, 'unstakeGldt').mockResolvedValueOnce(stakePositionMockResponse);

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

	it('should call toastError with default message if unstakeGldt throws', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		mockAuthStore();
		vi.spyOn(toastsStore, 'toastsError');
		vi.mocked(gldtStakeService.unstakeGldt).mockRejectedValueOnce(new Error('test error'));

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

		await waitFor(() => {
			expect(toastsStore.toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: en.stake.error.unexpected_error_on_unstake },
				err: new Error('test error')
			});
		});
	});

	it('should call toastError with custom message if unstakeGldt throws GldtUnstakeDissolvementsLimitReached', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		mockAuthStore();
		vi.spyOn(toastsStore, 'toastsError');
		vi.mocked(gldtStakeService.unstakeGldt).mockRejectedValueOnce(
			new GldtUnstakeDissolvementsLimitReached('test error')
		);

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

		await waitFor(() => {
			expect(toastsStore.toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: {
					text: replacePlaceholders(en.stake.error.dissolvement_limit_reached, {
						$limit: `${Number(configMockResponse.max_dissolve_events)}`
					}),
					renderAsHtml: true
				}
			});
		});
	});
});
