<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import type { LogoSize } from '$lib/types/logo-size';

	export let token: Pick<Token, 'icon' | 'name' | 'network'>;
	export let color: 'dust' | 'off-white' | 'white' = 'dust';
	export let showNetworkIcon = true;
	export let networkIconBlackAndWhite = false;
	export let ring = false;
	export let size: LogoSize | undefined = undefined;
	export let styleClass: string | undefined = undefined;

	const {
		icon,
		name,
		network: { name: networkName, icon: networkIcon, iconBW: networkIconBW }
	} = token;
</script>

<div class="relative">
	<Logo
		src={icon}
		alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
		{styleClass}
		{size}
		{color}
		{ring}
	/>
	{#if showNetworkIcon}
		<div class="absolute -bottom-1 -right-1">
			<Logo
				src={networkIconBlackAndWhite ? networkIconBW : networkIcon}
				alt={replacePlaceholders($i18n.core.alt.logo, { $name: networkName })}
				{color}
			/>
		</div>
	{/if}
</div>
