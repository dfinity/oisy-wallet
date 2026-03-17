<script lang="ts">
	import { getContext } from 'svelte';
	import HarvestStakeEstimations from '$eth/components/stake/harvest-autopilot/HarvestStakeEstimations.svelte';
	import HarvestStakeFees from '$eth/components/stake/harvest-autopilot/HarvestStakeFees.svelte';
	import HarvestStakeProvider from '$eth/components/stake/harvest-autopilot/HarvestStakeProvider.svelte';
	import ReviewNetwork from '$lib/components/send/ReviewNetwork.svelte';
	import StakeReview from '$lib/components/stake/StakeReview.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Vault } from '$lib/types/vaults';
	import { invalidAmount } from '$lib/utils/input.utils';

	interface Props {
		amount?: OptionAmount;
		vault: Vault;
		onBack: () => void;
		onStake: () => void;
	}

	let { amount, vault, onBack, onStake }: Props = $props();

	const { sendToken } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let invalid = $derived(invalidAmount(amount) || Number(amount) === 0);
</script>

<StakeReview
	actionButtonLabel={$i18n.stake.text.stake_now}
	{amount}
	disabled={invalid}
	{onBack}
	onConfirm={onStake}
>
	{#snippet subtitle()}
		{$i18n.stake.text.stake_review_subtitle}
	{/snippet}

	{#snippet content()}
		<ReviewNetwork sourceNetwork={$sendToken.network} />

		<HarvestStakeFees />

		<HarvestStakeEstimations {amount} {vault} />

		<HarvestStakeProvider apy={Number(vault.apy ?? 0)} />
	{/snippet}
</StakeReview>
