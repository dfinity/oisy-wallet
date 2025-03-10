import { isNetworkIdETH } from '$icp/utils/ic-send.utils';
import { ProgressStepsSendIc } from '$lib/enums/progress-steps';
import type { NetworkId } from '$lib/types/network';
import type { ProgressSteps } from '$lib/types/progress-steps';
import { isNetworkIdBitcoin } from '$lib/utils/network.utils';
import type { ProgressStep } from '@dfinity/gix-components';

export const sendSteps = ({
	i18n,
	networkId,
	tokenCkErc20Ledger
}: {
	i18n: I18n;
	networkId: NetworkId | undefined;
	tokenCkErc20Ledger: boolean;
}): ProgressSteps => [
	{
		step: ProgressStepsSendIc.INITIALIZATION,
		text: i18n.send.text.initializing_transaction,
		state: 'in_progress'
	} as ProgressStep,
	...(tokenCkErc20Ledger
		? [
				{
					step: ProgressStepsSendIc.APPROVE_FEES,
					text: i18n.send.text.approving_fees,
					state: 'next'
				} as ProgressStep
			]
		: []),
	...(isNetworkIdBitcoin(networkId) || isNetworkIdETH(networkId)
		? [
				{
					step: ProgressStepsSendIc.APPROVE_TRANSFER,
					text: tokenCkErc20Ledger ? i18n.send.text.approving_transfer : i18n.send.text.approving,
					state: 'next'
				} as ProgressStep
			]
		: []),
	{
		step: ProgressStepsSendIc.SEND,
		text: i18n.send.text.sending,
		state: 'next'
	} as ProgressStep,
	{
		step: ProgressStepsSendIc.RELOAD,
		text: i18n.send.text.refreshing_ui,
		state: 'next'
	} as ProgressStep
];
