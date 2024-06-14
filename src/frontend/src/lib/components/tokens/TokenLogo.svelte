<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { i18n } from '$lib/stores/i18n.store';

	export let token: Token;
	export let color: 'dust' | 'off-white' | 'white' = 'dust';
	export let showNetworkIcon = true;

	const {
		icon,
		name,
		network: { name: networkName, icon: networkIcon }
	} = token;
</script>

<div class="relative">
	<Logo
		src={icon}
		alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
		size="medium"
		{color}
	/>
	{#if showNetworkIcon}
		<div class="absolute bottom-0 right-0">
			<Logo
				src={networkIcon}
				alt={replacePlaceholders($i18n.core.alt.logo, { $name: networkName })}
				{color}
			/>
		</div>
	{/if}
</div>
