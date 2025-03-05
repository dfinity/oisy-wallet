<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import type { AirdropDescription } from '$env/types/env-airdrop';
	import { MILLISECONDS_IN_DAY } from '$lib/constants/app.constants';

	export let airdrop: AirdropDescription;

	let endsIn: string;
	$: endsIn =
		Math.floor((new Date(airdrop.endDate).getTime() - new Date().getTime()) / MILLISECONDS_IN_DAY) +
		' days';
</script>

<span class="inline-flex">
	<span class="mr-1 whitespace-nowrap text-sm">Ends in</span>
	<Badge variant="warning">{endsIn}</Badge>
</span>
