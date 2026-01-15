<script lang="ts">
	import DateBadge from '$lib/components/ui/DateBadge.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { isEndedCampaign, isUpcomingCampaign } from '$lib/utils/rewards.utils';

	interface Props {
		startDate: Date;
		endDate: Date;
		testId?: string;
	}

	let { startDate, endDate, testId }: Props = $props();

	const isUpcoming = $derived(isUpcomingCampaign(startDate));
	const hasEnded = $derived(isEndedCampaign(endDate));
</script>

<DateBadge
	date={isUpcoming ? startDate : endDate}
	prefix={isUpcoming
		? $i18n.rewards.text.upcoming_date
		: hasEnded
			? $i18n.rewards.text.ended_date
			: $i18n.rewards.text.active_date}
	showIcon
	{testId}
></DateBadge>
