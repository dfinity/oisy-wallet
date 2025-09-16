<script lang="ts">
	import DateBadge from '$lib/components/ui/DateBadge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { isEndedCampaign } from '$lib/utils/rewards.utils';

	interface Props {
		date: Date;
		testId?: string;
	}

	let { date, testId }: Props = $props();

	const hasEnded = $derived(isEndedCampaign(date));
</script>

<DateBadge
	{date}
	prefix={hasEnded ? $i18n.rewards.text.ended_date : $i18n.rewards.text.active_date}
	showIcon
	{testId}
></DateBadge>
