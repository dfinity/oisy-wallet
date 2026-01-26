import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtClaimStakingRewardWizard from '$icp/components/stake/gldt/GldtClaimStakingRewardWizard.svelte';
import * as gldtStakeService from '$icp/services/gldt-stake.services';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import { WizardStepsClaimStakingReward } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('GldtClaimStakingRewardWizard', () => {
	const mockContext = () =>
		new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
		]);

	const props = {
		rewardAmount: 0.001,
		claimStakingRewardProgressStep: 'test',
		onClose: () => {},
		onBack: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(gldtStakeService, 'claimGldtStakingReward').mockResolvedValueOnce(
			stakePositionMockResponse
		);
	});

	it('should render review form if currentStep is REVIEW', () => {
		const { getByTestId } = render(GldtClaimStakingRewardWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsClaimStakingReward.REVIEW,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toBeInTheDocument();
	});

	it('should render claim reward progress if currentStep is CLAIMING', () => {
		const { container } = render(GldtClaimStakingRewardWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsClaimStakingReward.CLAIMING,
					title: 'test'
				}
			},
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.core.warning.do_not_close);
	});

	it('should call claimGldtStakingReward if conditions met', async () => {
		mockAuthStore();

		const { getByTestId } = render(GldtClaimStakingRewardWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsClaimStakingReward.REVIEW,
					title: 'test'
				}
			},
			context: mockContext()
		});

		const button = getByTestId(STAKE_REVIEW_FORM_BUTTON);

		await fireEvent.click(button);

		expect(gldtStakeService.claimGldtStakingReward).toHaveBeenCalledOnce();
	});

	it('should not call claimGldtStakingReward if identity is not available', async () => {
		const { getByTestId } = render(GldtClaimStakingRewardWizard, {
			props: {
				...props,
				currentStep: {
					name: WizardStepsClaimStakingReward.REVIEW,
					title: 'test'
				}
			},
			context: mockContext()
		});

		const button = getByTestId(STAKE_REVIEW_FORM_BUTTON);

		await fireEvent.click(button);

		expect(gldtStakeService.claimGldtStakingReward).not.toHaveBeenCalledOnce();
	});
});
