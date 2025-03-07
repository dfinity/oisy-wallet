<script lang="ts">
	import DateBadge from '$lib/components/ui/DateBadge.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let date: Date;
	export let testId: string | undefined = undefined;
</script>

<DateBadge variant="warning" {date} {testId} prefix={$i18n.airdrops.text.active_date}></DateBadge>
