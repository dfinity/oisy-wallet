<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LogoSize } from '$lib/types/components';
	import type { Network } from '$lib/types/network';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let network: Network;
	export let blackAndWhite = false;
	export let size: LogoSize = 'xxs';
	export let color: 'dust' | 'off-white' | 'white' = 'dust';
	export let testId: string | undefined = undefined;
</script>

<Logo
	src={blackAndWhite ? network.iconBW : network.icon}
	alt={replacePlaceholders($i18n.core.alt.logo, { $name: network.name })}
	{size}
	{color}
	{testId}
/>
