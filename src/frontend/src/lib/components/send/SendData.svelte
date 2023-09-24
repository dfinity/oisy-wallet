<script lang="ts">
	import SendSource from '$lib/components/send/SendSource.svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import SendDataDestination from '$lib/components/send/SendDataDestination.svelte';
	import type { Token } from '$lib/types/token';
	import type { TargetNetwork } from '$lib/enums/network';

	export let destination = '';
	export let amount: string | number | undefined = undefined;
	export let token: Token;
	export let network: TargetNetwork | undefined = undefined;
</script>

<SendDataDestination {destination} {amount} {token} {network} />

<slot />

<SendSource {token} />

<FeeDisplay />
