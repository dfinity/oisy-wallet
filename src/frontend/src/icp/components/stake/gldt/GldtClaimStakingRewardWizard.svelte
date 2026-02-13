<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import GldtClaimStakingRewardReview from '$icp/components/stake/gldt/GldtClaimStakingRewardReview.svelte';
	import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
	import { claimGldtStakingReward } from '$icp/services/gldt-stake.services';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import type { IcToken } from '$icp/types/ic-token';
	import ClaimStakingRewardProgress from '$lib/components/stake/ClaimStakingRewardProgress.svelte';
	import {
		TRACK_COUNT_CLAIM_STAKING_REWARD_SUCCESS,
		TRACK_COUNT_CLAIM_STAKING_REWARD_ERROR
	} from '$lib/constants/analytics.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsClaimStakingReward } from '$lib/enums/progress-steps';
	import { WizardStepsClaimStakingReward } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { Amount } from '$lib/types/send';

	interface Props {
		rewardAmount: Amount;
		claimStakingRewardProgressStep: string;
		currentStep?: WizardStep;
		onClose: () => void;
		onBack: () => void;
		onNext: () => void;
	}

	let {
		rewardAmount,
		claimStakingRewardProgressStep = $bindable(),
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sendToken, sendTokenSymbol, sendTokenId } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	const claimStakingReward = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		onNext();

		try {
			const trackAnalyticsOnClaimStakingRewardComplete = () => {
				trackEvent({
					name: TRACK_COUNT_CLAIM_STAKING_REWARD_SUCCESS,
					metadata: {
						token: $sendTokenSymbol
					}
				});
			};

			const result = await claimGldtStakingReward({
				identity: $authIdentity,
				token: $sendToken as IcToken,
				isTokenDisabled: $enabledIcrcTokens.every(({ id }) => $sendTokenId !== id),
				progress: (step: ProgressStepsClaimStakingReward) =>
					(claimStakingRewardProgressStep = step),
				claimStakingRewardCompleted: trackAnalyticsOnClaimStakingRewardComplete
			});

			gldtStakeStore.setPosition(result);

			claimStakingRewardProgressStep = ProgressStepsClaimStakingReward.DONE;

			setTimeout(() => onClose(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_CLAIM_STAKING_REWARD_ERROR,
				metadata: {
					token: $sendTokenSymbol
				}
			});

			toastsError({
				msg: { text: $i18n.send.error.unexpected },
				err
			});

			onBack();
		}
	};
</script>

{#key currentStep?.name}
	{#if currentStep?.name === WizardStepsClaimStakingReward.REVIEW}
		<GldtClaimStakingRewardReview onClaimReward={claimStakingReward} {onClose} {rewardAmount} />
	{:else if currentStep?.name === WizardStepsClaimStakingReward.CLAIMING}
		<ClaimStakingRewardProgress {claimStakingRewardProgressStep} />
	{/if}
{/key}
