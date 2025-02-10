<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';

	export let endDate: Date;

	let formattedDate = `${endDate.toLocaleDateString('en-US', { month: 'long' })} ${endDate.getDate()}`;
</script>

<ul class="flex list-none flex-wrap gap-2">
	<li class="flex">
		<Badge>
			Due on {formattedDate}
		</Badge>
	</li>
</ul>