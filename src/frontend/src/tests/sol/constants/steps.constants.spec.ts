import { ProgressStepsSendSol, ProgressStepsSign } from '$lib/enums/progress-steps';
import { sendSteps, walletConnectSignSteps } from '$sol/constants/steps.constants';
import en from '$tests/mocks/i18n.mock';

describe('steps.constants', () => {
	describe('sendSteps', () => {
		it('returns the correct steps with expected text and state', () => {
			const steps = sendSteps(en);

			expect(steps).toEqual([
				{
					step: ProgressStepsSendSol.INITIALIZATION,
					text: en.send.text.initializing_transaction,
					state: 'in_progress'
				},
				{
					step: ProgressStepsSendSol.SIGN,
					text: en.send.text.signing_message,
					state: 'next'
				},
				{
					step: ProgressStepsSendSol.SEND,
					text: en.send.text.sending,
					state: 'next'
				},
				{
					step: ProgressStepsSendSol.RELOAD,
					text: en.send.text.refreshing_ui,
					state: 'next'
				}
			]);
		});
	});

	describe('walletConnectSignSteps', () => {
		it('returns steps without SEND when signWithSending is false', () => {
			const steps = walletConnectSignSteps({
				i18n: en,
				signWithSending: false
			});

			expect(steps).toEqual([
				{
					step: ProgressStepsSign.INITIALIZATION,
					text: en.send.text.initializing,
					state: 'in_progress'
				},
				{
					step: ProgressStepsSign.SIGN,
					text: en.send.text.signing_message,
					state: 'next'
				},
				{
					step: ProgressStepsSign.APPROVE_WALLET_CONNECT,
					text: en.send.text.approving,
					state: 'next'
				}
			]);
		});

		it('returns steps with SEND when signWithSending is true', () => {
			const steps = walletConnectSignSteps({
				i18n: en,
				signWithSending: true
			});

			expect(steps).toEqual([
				{
					step: ProgressStepsSign.INITIALIZATION,
					text: en.send.text.initializing,
					state: 'in_progress'
				},
				{
					step: ProgressStepsSign.SIGN,
					text: en.send.text.signing_message,
					state: 'next'
				},
				{
					step: ProgressStepsSendSol.SEND,
					text: en.send.text.sending,
					state: 'next'
				},
				{
					step: ProgressStepsSign.APPROVE_WALLET_CONNECT,
					text: en.send.text.approving,
					state: 'next'
				}
			]);
		});
	});
});
