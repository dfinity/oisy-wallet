<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import type { Token } from '$lib/types/token';

	export let token: Token;
	export let size: string;
	export let color: 'dust' | 'off-white' | 'white' = 'dust';
	export let showNetworkIcon = true;

	const {
		icon,
		name,
		network: { name: networkName, icon: networkIcon }
	} = token;
</script>

<div class="relative">
	<Logo src={icon} alt={`${name} logo`} {size} {color} />
	{#if showNetworkIcon}
		<div class="absolute bottom-0 right-0">
			<Logo src={networkIcon} alt={`${networkName} logo`} size={`calc(${size} *20 / 52)`} {color} />
		</div>
	{/if}
</div>
