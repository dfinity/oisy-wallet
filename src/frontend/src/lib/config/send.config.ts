import { WizardStepsSend } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '@dfinity/gix-components';

interface SendWizardStepsParams extends WizardStepsParams {
	converting?: boolean;
}

const sendWizardStepsQrCodeScan = ({
	i18n
}: SendWizardStepsParams): WizardSteps<WizardStepsSend> => [
	{
		name: WizardStepsSend.QR_CODE_SCAN,
		title: i18n.send.text.scan_qr
	}
];

const sendWizardStepsFilterNetworks = ({
	i18n
}: SendWizardStepsParams): WizardSteps<WizardStepsSend> => [
	{
		name: WizardStepsSend.FILTER_NETWORKS,
		title: i18n.send.text.select_network_filter
	}
];

export const sendWizardSteps = ({
	i18n,
	converting
}: SendWizardStepsParams): WizardSteps<WizardStepsSend> => [
	{
		name: WizardStepsSend.DESTINATION,
		title: i18n.send.text.send
	},
	{
		name: WizardStepsSend.SEND,
		title: i18n.send.text.send
	},
	{
		name: WizardStepsSend.REVIEW,
		title: i18n.send.text.review
	},
	{
		name: WizardStepsSend.SENDING,
		title: converting ? i18n.convert.text.converting : i18n.send.text.sending
	}
];

export const sendWizardStepsWithQrCodeScan = (
	params: SendWizardStepsParams
): WizardSteps<WizardStepsSend> => [
	...sendWizardSteps(params),
	...sendWizardStepsQrCodeScan(params)
];

export const allSendWizardSteps = (params: SendWizardStepsParams): WizardSteps<WizardStepsSend> => [
	{
		name: WizardStepsSend.TOKENS_LIST,
		title: params.i18n.send.text.select_token
	},
	...sendWizardStepsFilterNetworks(params),
	...sendWizardStepsWithQrCodeScan(params)
];

export const sendNftsWizardSteps = (
	params: SendWizardStepsParams
): WizardSteps<WizardStepsSend> => [
	{
		name: WizardStepsSend.DESTINATION,
		title: params.i18n.send.text.send
	},
	{
		name: WizardStepsSend.REVIEW,
		title: params.i18n.send.text.review
	},
	{
		name: WizardStepsSend.SENDING,
		title: params.i18n.send.text.sending
	}
];

export const allSendNftsWizardSteps = (
	params: SendWizardStepsParams
): WizardSteps<WizardStepsSend> => [
	{
		name: WizardStepsSend.NFTS_LIST,
		title: params.i18n.send.text.select_nft
	},
	...sendWizardStepsFilterNetworks(params),
	...sendNftsWizardSteps(params)
];
