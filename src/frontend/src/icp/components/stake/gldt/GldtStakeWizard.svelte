<script lang="ts">
	import type { WizardStep } from '@dfinity/gix-components';
	import { Principal } from '@dfinity/principal';
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import GldtStakeForm from '$icp/components/stake/gldt/GldtStakeForm.svelte';
	import GldtStakeReview from '$icp/components/stake/gldt/GldtStakeReview.svelte';
	import { stakeGldt } from '$icp/services/gldt-stake.services';
	import { GLDT_STAKE_CONTEXT_KEY, type GldtStakeContext } from '$icp/stores/gldt-stake.store';
	import type { IcToken } from '$icp/types/ic-token';
	import StakeProgress from '$lib/components/stake/StakeProgress.svelte';
	import {
		TRACK_COUNT_STAKE_ERROR,
		TRACK_COUNT_STAKE_SUCCESS
	} from '$lib/constants/analytics.constants';
	import { GLDT_STAKE_CANISTER_ID } from '$lib/constants/app.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { ProgressStepsStake } from '$lib/enums/progress-steps';
	import { WizardStepsStake } from '$lib/enums/wizard-steps';
	import { trackEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OptionAmount } from '$lib/types/send';
	import { invalidAmount } from '$lib/utils/input.utils';
	import { parseToken } from '$lib/utils/parse.utils';

	interface Props {
		amount: OptionAmount;
		stakeProgressStep: string;
		currentStep?: WizardStep;
		onClose: () => void;
		onBack: () => void;
		onNext: () => void;
	}

	let {
		amount = $bindable(),
		stakeProgressStep = $bindable(),
		currentStep,
		onClose,
		onNext,
		onBack
	}: Props = $props();

	const { sendTokenDecimals, sendTokenSymbol, sendToken } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	const { store: gldtStakeStore } = getContext<GldtStakeContext>(GLDT_STAKE_CONTEXT_KEY);

	const destination = Principal.fromText(GLDT_STAKE_CANISTER_ID).toString();

	const stake = async () => {
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
			const trackAnalyticsOnStakeComplete = () => {
				trackEvent({
					name: TRACK_COUNT_STAKE_SUCCESS,
					metadata: {
						token: $sendTokenSymbol
					}
				});
			};

			const result = await stakeGldt({
				identity: $authIdentity,
				amount: parseToken({
					value: `${amount}`,
					unitName: $sendTokenDecimals
				}),
				gldtToken: $sendToken as IcToken,
				progress: (step: ProgressStepsStake) => (stakeProgressStep = step),
				stakeCompleted: trackAnalyticsOnStakeComplete
			});

			gldtStakeStore.setPosition(result);

			stakeProgressStep = ProgressStepsStake.DONE;

			setTimeout(() => onClose(), 750);
		} catch (err: unknown) {
			trackEvent({
				name: TRACK_COUNT_STAKE_ERROR,
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
	{#if currentStep?.name === WizardStepsStake.STAKE}
		<GldtStakeForm {destination} {onClose} {onNext} bind:amount />
	{:else if currentStep?.name === WizardStepsStake.REVIEW}
		<GldtStakeReview {amount} {destination} {onBack} onStake={stake} />
	{:else if currentStep?.name === WizardStepsStake.STAKING}
		<StakeProgress {stakeProgressStep} />
	{/if}
{/key}
