import {
	sendSteps,
	walletConnectSendSteps,
	walletConnectSignSteps
} from '$eth/constants/steps.constants';
import { ProgressStepsSend, ProgressStepsSign } from '$lib/enums/progress-steps';
import type { ProgressSteps } from '$lib/types/progress-steps';
import en from '$tests/mocks/i18n.mock';
import type { ProgressStep } from '@dfinity/gix-components';

describe('steps.constants', () => {
	const expectedSendStepsWithoutApproval: ProgressSteps = [
		{
			step: ProgressStepsSend.INITIALIZATION,
			text: en.send.text.initializing_transaction,
			state: 'in_progress'
		},
		{
			step: ProgressStepsSend.SIGN_TRANSFER,
			text: en.send.text.signing_transaction,
			state: 'next'
		},
		{
			step: ProgressStepsSend.TRANSFER,
			text: en.send.text.sending,
			state: 'next'
		}
	];

	const expectedSendStepsWithApproval: ProgressSteps = [
		{
			step: ProgressStepsSend.INITIALIZATION,
			text: en.send.text.initializing_transaction,
			state: 'in_progress'
		},
		{
			step: ProgressStepsSend.SIGN_APPROVE,
			text: en.send.text.signing_approval,
			state: 'next'
		},
		{
			step: ProgressStepsSend.APPROVE,
			text: en.send.text.approving,
			state: 'next'
		},
		{
			step: ProgressStepsSend.SIGN_TRANSFER,
			text: en.send.text.signing_transaction,
			state: 'next'
		},
		{
			step: ProgressStepsSend.TRANSFER,
			text: en.send.text.sending,
			state: 'next'
		}
	];

	describe('sendSteps', () => {
		it('should return the correct steps with expected text and state when sendWithApproval is false', () => {
			const steps = sendSteps({ i18n: en, sendWithApproval: false });

			expect(steps).toEqual(expectedSendStepsWithoutApproval);
		});

		it('should return the correct steps with expected text and state when sendWithApproval is true', () => {
			const steps = sendSteps({ i18n: en, sendWithApproval: true });

			expect(steps).toEqual(expectedSendStepsWithApproval);
		});
	});

	describe('walletConnectSendSteps', () => {
		const expectedWalletConnectSendStep: ProgressStep = {
			step: ProgressStepsSend.APPROVE_WALLET_CONNECT,
			text: en.send.text.approving_wallet_connect,
			state: 'next'
		};

		it('should return the correct steps with expected text and state when sendWithApproval is false', () => {
			const steps = walletConnectSendSteps({ i18n: en, sendWithApproval: false });

			expect(steps).toEqual([...expectedSendStepsWithoutApproval, expectedWalletConnectSendStep]);
		});

		it('should return the correct steps with expected text and state when sendWithApproval is true', () => {
			const steps = walletConnectSendSteps({ i18n: en, sendWithApproval: true });

			expect(steps).toEqual([...expectedSendStepsWithApproval, expectedWalletConnectSendStep]);
		});
	});

	describe('walletConnectSignSteps', () => {
		it('should return the correct steps with expected text and state', () => {
			const steps = walletConnectSignSteps(en);

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
					text: en.send.text.approving_wallet_connect,
					state: 'next'
				}
			]);
		});
	});
});
