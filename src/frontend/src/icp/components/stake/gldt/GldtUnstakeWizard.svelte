<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import GldtUnstakeForm from '$icp/components/stake/gldt/GldtUnstakeForm.svelte';
	import GldtUnstakeReview from '$icp/components/stake/gldt/GldtUnstakeReview.svelte';
	import { unstakeGldt } from '$icp/services/gldt-stake.services';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import UnstakeProgress from '$lib/components/stake/UnstakeProgress.svelte';
	import {
		TRACK_COUNT_UNSTAKE_ERROR,
		TRACK_COUNT_UNSTAKE_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { ZERO } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsUnstake } from '$lib/enums/progress-steps';
	import { WizardStepsUnstake } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		amount: OptionAmount;
		unstakeProgressStep: string;
		currentStep?: WizardStep;
		onClose: () => void;
		onBack: () => void;
		onNext: () => void;
	}

	let {
		amount = $bindable(),
		unstakeProgressStep = $bindable(),
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sendTokenDecimals, sendTokenSymbol } = getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	let dissolveInstantly = $state(false);

	let amountToReceive = $state<number | undefined>();

	const unstake = async () => {
		if (isNullish($authIdentity)) {
			return;
		}

		if (invalidAmount(amount) || isNullish(amount)) {
			toastsError({
				msg: { text: $i18n.send.assertion.amount_invalid }
			});
			return;
		}

		onNext();

		try {
			const trackAnalyticsOnUnstakeComplete = () => {
				trackEvent({
					name: TRACK_COUNT_UNSTAKE_SUCCESS,
					metadata: {
						token: $sendTokenSymbol
					}
				});
			};

			const result = await unstakeGldt({
				identity: $authIdentity,
				dissolveInstantly,
				totalStakedAmount: $gldtStakeStore?.position?.staked ?? ZERO,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				progress: (step: ProgressStepsUnstake) => (unstakeProgressStep = step),
				unstakeCompleted: trackAnalyticsOnUnstakeComplete
			});

			gldtStakeStore.setPosition(result);

			unstakeProgressStep = ProgressStepsUnstake.DONE;

			setTimeout(() => onClose(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_UNSTAKE_ERROR,
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
	{#if currentStep?.name === WizardStepsUnstake.UNSTAKE}
		<GldtUnstakeForm {onClose} {onNext} bind:amount bind:dissolveInstantly bind:amountToReceive />
	{:else if currentStep?.name === WizardStepsUnstake.REVIEW}
		<GldtUnstakeReview
			{amount}
			{amountToReceive}
			{dissolveInstantly}
			{onBack}
			onUnstake={unstake}
		/>
	{:else if currentStep?.name === WizardStepsUnstake.UNSTAKING}
		<UnstakeProgress {unstakeProgressStep} />
	{/if}
{/key}
