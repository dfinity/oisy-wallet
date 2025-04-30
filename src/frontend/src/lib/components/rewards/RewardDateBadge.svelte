<script lang="ts">
	import DateBadge from '$lib/components/ui/DateBadge.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		date: Date;
		testId?: string | undefined;
	}

	let { date, testId = undefined }: Props = $props();
</script>

<DateBadge variant="warning" {date} {testId} prefix={$i18n.rewards.text.active_date}></DateBadge>
