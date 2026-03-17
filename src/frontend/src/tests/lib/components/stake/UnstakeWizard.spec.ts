import type { IcToken } from '$icp/types/ic-token';
import UnstakeWizard from '$lib/components/stake/UnstakeWizard.svelte';
import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('UnstakeWizard', () => {
	const mockContext = (token: IcToken) =>
		new Map<symbol, SendContext>([[SEND_CONTEXT_KEY, initSendContext({ token })]]);

	const props = {
		amount: 0.001,
		unstakeProgressStep: 'test',
		currentStep: {
			name: WizardStepsUnstake.UNSTAKE,
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
		const { container } = render(UnstakeWizard, {
			props,
			context: mockContext(mockValidIcrcToken)
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});
});
