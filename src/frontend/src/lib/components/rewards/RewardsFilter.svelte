<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { RewardStates } from '$lib/enums/reward-states';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		rewardState: RewardStates;
		endedCampaignsAmount?: number;
	}

	let { rewardState = $bindable(), endedCampaignsAmount = 0 }: Props = $props();
</script>

<div class="no-scrollbar mb-5 flex gap-4 overflow-x-auto p-1 md:flex-wrap md:p-0">
	<Button
		paddingSmall
		ariaLabel={$i18n.rewards.text.ongoing}
		on:click={() => (rewardState = RewardStates.ONGOING)}
		styleClass="text-nowrap max-w-28 text-sm"
		colorStyle={rewardState === RewardStates.ONGOING ? 'primary' : 'tertiary'}
	>
		{$i18n.rewards.text.ongoing}
	</Button>

	<Button
		paddingSmall
		ariaLabel={$i18n.rewards.text.ended}
		on:click={() => (rewardState = RewardStates.ENDED)}
		styleClass="text-nowrap max-w-28 text-sm"
		colorStyle={rewardState === RewardStates.ENDED ? 'primary' : 'tertiary'}
	>
		{replacePlaceholders($i18n.rewards.text.ended, { $amount: endedCampaignsAmount.toString() })}
	</Button>
</div>
