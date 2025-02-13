<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import DateBadge from "$lib/components/ui/DateBadge.svelte";

	export let date: Date;
	export let testId: string | undefined = undefined;
</script>

<ul class="gap-2 flex list-none flex-wrap" data-tid={testId}>
	<li class="flex">
		<DateBadge
				{date}
				{testId}
				prefix={$i18n.airdrops.text.active_date}
		>
		</DateBadge>
	</li>
</ul>
