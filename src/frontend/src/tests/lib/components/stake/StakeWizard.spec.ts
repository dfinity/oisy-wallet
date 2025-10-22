import { GLDT_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import {
	GLDT_STAKE_CONTEXT_KEY,
	initGldtStakeStore,
	type GldtStakeContext
} from '$icp/stores/gldt-stake.store';
import type { IcToken } from '$icp/types/ic-token';
import StakeWizard from '$lib/components/stake/StakeWizard.svelte';
import * as appConstants from '$lib/constants/app.constants';
import { STAKE_FORM_REVIEW_BUTTON } from '$lib/constants/test-ids.constants';
import { WizardStepsStake } from '$lib/enums/wizard-steps';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import en from '$tests/mocks/i18n.mock';
import { mockLedgerCanisterId, mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';

describe('StakeWizard', () => {
	const mockContext = (token: IcToken) =>
		new Map<symbol, SendContext | GldtStakeContext>([
			[SEND_CONTEXT_KEY, initSendContext({ token })],
			[GLDT_STAKE_CONTEXT_KEY, { store: initGldtStakeStore() }]
		]);

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

		vi.spyOn(appConstants, 'GLDT_STAKE_CANISTER_ID', 'get').mockImplementation(
			() => mockLedgerCanisterId
		);
	});

	it('renders GLDT token wizard', () => {
		const { getByTestId } = render(StakeWizard, {
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
		const { container } = render(StakeWizard, {
			props,
			context: mockContext(mockValidIcrcToken)
		});

		expect(container).toHaveTextContent(en.stake.text.unsupported_token_staking);
	});
});
