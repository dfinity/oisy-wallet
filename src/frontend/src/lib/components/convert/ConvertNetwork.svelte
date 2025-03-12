<script lang="ts">
	import NetworkLogo from '$lib/components/networks/NetworkLogo.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import type { Token } from '$lib/types/token';

	export let token: Token;
</script>

<ModalValue>
	<slot slot="label" name="label" />

	<div class="flex" slot="main-value">
		<NetworkLogo network={token.network} blackAndWhite color="off-white" />
		<span class="ml-2">{token.network.name}</span>
	</div>
</ModalValue>
