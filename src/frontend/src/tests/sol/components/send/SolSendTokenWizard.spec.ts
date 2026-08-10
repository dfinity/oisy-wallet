import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import { REVIEW_FORM_SEND_BUTTON } from '$lib/constants/test-ids.constants';
import * as addressDerived from '$lib/derived/address.derived';
import { ProgressStepsSendSol } from '$lib/enums/progress-steps';
import { WizardStepsSend } from '$lib/enums/wizard-steps';
import * as walletUtils from '$lib/utils/wallet.utils';
import * as solanaApi from '$sol/api/solana.api';
import SolSendTokenWizard from '$sol/components/send/SolSendTokenWizard.svelte';
import * as solSendServices from '$sol/services/sol-send.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockSignature } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';
import { mockContextMap } from '$tests/utils/context.test-utils';
import { mockSendContextEntry } from '$tests/utils/send.context.test-utils';
import { signature } from '@solana/kit';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SolSendTokenWizard', () => {
	const props = {
		currentStep: { name: WizardStepsSend.REVIEW, title: 'title' },
		sendProgressStep: ProgressStepsSendSol.INITIALIZATION,
		amount: 0.001,
		destination: mockSolAddress2,
		onBack: vi.fn(),
		onClose: vi.fn(),
		onNext: vi.fn(),
		onSendBack: vi.fn(),
		onTokensList: vi.fn()
	};

	const renderWizard = () =>
		render(SolSendTokenWizard, {
			props,
			context: mockContextMap([mockSendContextEntry({ token: SOLANA_TOKEN })])
		});

	const clickSend = async (container: HTMLElement) => {
		const button = container.querySelector<HTMLButtonElement>(
			`[data-tid="${REVIEW_FORM_SEND_BUTTON}"]`
		);

		await fireEvent.click(button as HTMLButtonElement);
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		vi.spyOn(addressDerived, 'solAddressMainnet', 'get').mockImplementation(() =>
			readable(mockSolAddress)
		);
		vi.spyOn(solanaApi, 'estimatePriorityFee').mockResolvedValue(ZERO);
		vi.spyOn(walletUtils, 'waitAndTriggerWallet').mockResolvedValue(undefined);
	});

	it('should trigger the wallet after a successful send, so the pending transaction shows up', async () => {
		const spySendSol = vi
			.spyOn(solSendServices, 'sendSol')
			.mockResolvedValue(signature(mockSignature));

		const { container } = renderWizard();

		await clickSend(container);

		await waitFor(() => {
			expect(spySendSol).toHaveBeenCalledOnce();
		});

		await waitFor(() => {
			expect(walletUtils.waitAndTriggerWallet).toHaveBeenCalledOnce();
		});
	});

	it('should not trigger the wallet when the send fails', async () => {
		vi.spyOn(solSendServices, 'sendSol').mockRejectedValue(new Error('send failed'));

		const { container } = renderWizard();

		await clickSend(container);

		await waitFor(() => {
			expect(props.onBack).toHaveBeenCalled();
		});

		expect(walletUtils.waitAndTriggerWallet).not.toHaveBeenCalled();
	});
});
