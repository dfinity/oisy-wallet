import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import GldtStakeWizard from '$icp/components/stake/gldt/GldtStakeWizard.svelte';
import * as gldtStakeService from '$icp/services/gldt-stake.services';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import * as appConstants from '$lib/constants/app.constants';
import {
	STAKE_FORM_REVIEW_BUTTON,
	STAKE_REVIEW_FORM_BUTTON
} from '$lib/constants/test-ids.constants';
import { WizardStepsStake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import en from '$tests/mocks/i18n.mock';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('GldtStakeWizard', () => {
	const mockContext = () =>
		new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
		]);

	const props = {
		amount: 0.001,
		stakeProgressStep: 'test',
		onClose: () => {},
		onBack: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		vi.resetAllMocks();

		vi.spyOn(appConstants, 'GLDT_STAKE_CANISTER_ID', 'get').mockImplementation(
			() => mockLedgerCanisterId
		);
		vi.spyOn(gldtStakeService, 'stakeGldt').mockResolvedValueOnce(stakePositionMockResponse);
	});

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

	it('should call stakeGldt if conditions met', async () => {
		mockAuthStore();

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

		const button = getByTestId(STAKE_REVIEW_FORM_BUTTON);

		await fireEvent.click(button);

		expect(gldtStakeService.stakeGldt).toHaveBeenCalledOnce();
	});

	it('should not call stakeGldt if identity is not available', async () => {
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

		const button = getByTestId(STAKE_REVIEW_FORM_BUTTON);

		await fireEvent.click(button);

		expect(gldtStakeService.stakeGldt).not.toHaveBeenCalledOnce();
	});
});
