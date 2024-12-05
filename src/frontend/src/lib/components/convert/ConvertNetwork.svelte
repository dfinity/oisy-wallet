<script lang="ts">
	import ConvertValue from '$lib/components/convert/ConvertValue.svelte';
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import type { Token } from '$lib/types/token';

	export let token: Token;
</script>

<ConvertValue>
	<slot slot="label" name="label" />

	<div class="flex" slot="main-value">
		<NetworkLogo network={token.network} blackAndWhite color="off-white" />
		<span class="ml-2">{token.network.name}</span>
	</div>
</ConvertValue>
