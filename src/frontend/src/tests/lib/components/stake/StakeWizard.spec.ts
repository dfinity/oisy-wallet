import type { IcToken } from '$icp/types/ic-token';
import StakeWizard from '$lib/components/stake/StakeWizard.svelte';
import { WizardStepsStake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('StakeWizard', () => {
	const mockContext = (token: IcToken) =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token })]]);

	const props = {
		amount: 0.001,
		stakeProgressStep: 'test',
		currentStep: {
			name: WizardStepsStake.STAKE,
			title: 'test'
		},
		onClose: () => {},
		onBack: () => {},
		onNext: () => {}
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('renders unsupported staking message', () => {
		const { container } = render(StakeWizard, {
			props,
			context: mockContext(mockValidIcrcToken)
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});
});
