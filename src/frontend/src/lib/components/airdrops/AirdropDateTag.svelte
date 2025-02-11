<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';

	export let endDate: Date;
	export let testId: string | undefined = undefined;

	let formattedDate = `${endDate.toLocaleDateString('en-US', { month: 'long' })} ${endDate.getDate()}`;
</script>

<ul class="flex list-none flex-wrap gap-2" data-tid={testId}>
	<li class="flex">
		<Badge>
			{replacePlaceholders($i18n.airdrops.text.active_date, { $date: formattedDate })}
		</Badge>
	</li>
</ul>
