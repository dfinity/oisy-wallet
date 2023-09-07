<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';

	export let destination = '';
	export let amount: number | undefined = undefined;
</script>

<SendDestination {destination} {amount} />

<SendSource />

<FeeDisplay />
