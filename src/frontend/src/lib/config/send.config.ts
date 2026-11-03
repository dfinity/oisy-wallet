import { cyclesTopUpWizardSteps } from '$lib/config/cycles-top-up.config';
import { type WizardStepsCyclesTopUp, WizardStepsSend } from '$lib/enums/wizard-steps';
import type { WizardStepsParams } from '$lib/types/steps';
import type { WizardSteps } from '$lib/types/wizard';

interface SendWizardStepsParams extends WizardStepsParams {
	converting?: boolean;
	minting?: boolean;
	burning?: boolean;
	// For TCYCLES: a first step that chooses between sending them and topping up a canister, and
	// the top-up steps.
	sendOrTopUp?: boolean;
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

const sendWizardSteps = ({
	i18n,
	converting,
	minting,
	burning
}: SendWizardStepsParams): WizardSteps<WizardStepsSend> => [
	{
		name: WizardStepsSend.DESTINATION,
		title: i18n.send.text.send
	},
	{
		name: WizardStepsSend.SEND,
		title: minting ? i18n.mint.text.mint : burning ? i18n.burn.text.burn : i18n.send.text.send
	},
	{
		name: WizardStepsSend.REVIEW,
		title: i18n.send.text.review
	},
	{
		name: WizardStepsSend.SENDING,
		title: minting
			? i18n.mint.text.minting
			: burning
				? i18n.burn.text.burning
				: converting
					? i18n.convert.text.converting
					: i18n.send.text.sending
	}
];

// The choice comes before the send steps and the top-up after them, so that going on from the
// choice moves the wizard forward either way.
export const sendWizardStepsWithQrCodeScan = ({
	sendOrTopUp = false,
	...params
}: SendWizardStepsParams): WizardSteps<WizardStepsSend | WizardStepsCyclesTopUp> =>
	sendOrTopUp
		? [
				{
					name: WizardStepsSend.SEND_OR_TOP_UP,
					title: params.i18n.send.text.send
				},
				...sendWizardSteps(params),
				...sendWizardStepsQrCodeScan(params),
				...cyclesTopUpWizardSteps(params)
			]
		: [...sendWizardSteps(params), ...sendWizardStepsQrCodeScan(params)];

export const allSendWizardSteps = (
	params: SendWizardStepsParams
): WizardSteps<WizardStepsSend | WizardStepsCyclesTopUp> => [
	{
		name: WizardStepsSend.TOKENS_LIST,
		title: params.i18n.send.text.select_token
	},
	...sendWizardStepsFilterNetworks(params),
	...sendWizardStepsWithQrCodeScan(params)
];

const sendNftsWizardSteps = (params: SendWizardStepsParams): WizardSteps<WizardStepsSend> => [
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

export const sendNftsWizardStepsWithQrCodeScan = (
	params: SendWizardStepsParams
): WizardSteps<WizardStepsSend> => [
	...sendNftsWizardSteps(params),
	...sendWizardStepsQrCodeScan(params)
];

export const allSendNftsWizardSteps = (
	params: SendWizardStepsParams
): WizardSteps<WizardStepsSend> => [
	{
		name: WizardStepsSend.NFTS_LIST,
		title: params.i18n.send.text.select_nft
	},
	...sendWizardStepsFilterNetworks(params),
	...sendNftsWizardStepsWithQrCodeScan(params)
];
