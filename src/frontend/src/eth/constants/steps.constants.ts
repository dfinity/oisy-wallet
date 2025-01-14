import { ProgressStepsSend } from '$lib/enums/progress-steps';
import type { ProgressSteps } from '$lib/types/progress-steps';
import type { ProgressStep } from '@dfinity/gix-components';

export const sendSteps = ({
	i18n,
	sendWithApproval
}: {
	i18n: I18n;
	sendWithApproval: boolean;
}): ProgressSteps => [
	{
		step: ProgressStepsSend.INITIALIZATION,
		text: i18n.send.text.initializing_transaction,
		state: 'in_progress'
	} as ProgressStep,
	...(sendWithApproval
		? [
				{
					step: ProgressStepsSend.SIGN_APPROVE,
					text: i18n.send.text.signing_approval,
					state: 'next'
				} as ProgressStep,
				{
					step: ProgressStepsSend.APPROVE,
					text: i18n.send.text.approving,
					state: 'next'
				} as ProgressStep
			]
		: []),
	{
		step: ProgressStepsSend.SIGN_TRANSFER,
		text: i18n.send.text.signing_transaction,
		state: 'next'
	} as ProgressStep,
	{
		step: ProgressStepsSend.TRANSFER,
		text: i18n.send.text.sending,
		state: 'next'
	} as ProgressStep
];
