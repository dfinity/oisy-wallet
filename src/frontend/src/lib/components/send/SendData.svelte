<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import SendDataDestination from './SendDataDestination.svelte';
	import type { Token } from '$lib/types/token';

	export let destination = '';
	export let amount: string | number | undefined = undefined;
	export let token: Token;
	export let source: string;
</script>

<SendDataDestination {destination} {amount} {token}>
	<slot name="network" />
</SendDataDestination>

<slot />

<SendSource {token} {source} />

<slot name="fee" />
