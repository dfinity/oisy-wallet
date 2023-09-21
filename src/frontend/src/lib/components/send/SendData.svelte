<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import SendDestination from '$lib/components/send/SendDestination.svelte';
    import type {Token} from "$lib/types/token";

	export let destination = '';
	export let amount: string | number | undefined = undefined;
    export let token: Token;
</script>

<SendDestination {destination} {amount} />

<slot />

<SendSource />

<FeeDisplay />
