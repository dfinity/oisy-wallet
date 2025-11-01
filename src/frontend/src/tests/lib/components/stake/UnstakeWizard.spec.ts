import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import type { IcToken } from '$icp/types/ic-token';
import UnstakeWizard from '$lib/components/stake/UnstakeWizard.svelte';
import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('UnstakeWizard', () => {
	const mockContext = (token: IcToken) =>
		new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token })],
			[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
		]);

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

	it('renders GLDT token wizard', () => {
		const { getByTestId } = render(UnstakeWizard, {
			props,
			context: mockContext({
				...mockValidIcrcToken,
				symbol: 'GLDT',
				ledgerCanisterId: GLDT_LEDGER_CANISTER_ID
			})
		});

		expect(getByTestId(STAKE_FORM_REVIEW_BUTTON)).toBeInTheDocument();
	});

	it('renders unsupported staking message', () => {
		const { container } = render(UnstakeWizard, {
			props,
			context: mockContext(mockValidIcrcToken)
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});
});
