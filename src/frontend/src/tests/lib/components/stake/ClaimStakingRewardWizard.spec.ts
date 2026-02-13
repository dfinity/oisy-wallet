import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import ClaimStakingRewardWizard from '$lib/components/stake/ClaimStakingRewardWizard.svelte';
import { STAKE_REVIEW_FORM_BUTTON } from '$lib/constants/test-ids.constants';
import { WizardStepsClaimStakingReward } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import { StakeProvider } from '$lib/types/stake';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('ClaimStakingRewardWizard', () => {
	const mockContext = () =>
		new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token: ICP_TOKEN })],
			[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
		]);

	const props = {
		rewardAmount: 0.001,
		provider: StakeProvider.GLDT,
		claimStakingRewardProgressStep: 'test',
		currentStep: {
			name: WizardStepsClaimStakingReward.REVIEW,
			title: 'test'
		},
		onClose: () => {},
		onBack: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('renders GLDT token wizard', () => {
		const { getByTestId } = render(ClaimStakingRewardWizard, {
			props,
			context: mockContext()
		});

		expect(getByTestId(STAKE_REVIEW_FORM_BUTTON)).toBeInTheDocument();
	});

	it('renders unsupported staking message', () => {
		const { container } = render(ClaimStakingRewardWizard, {
			props: { ...props, provider: 'random' as StakeProvider },
			context: mockContext()
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});
});
