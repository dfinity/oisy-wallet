<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let token: Token;
	export let color: 'dust' | 'off-white' | 'white' = 'dust';
	export let tokenCount: number | undefined = undefined;
	export let showNetworkIcon = true;
	export let networkIconBlackAndWhite = false;
	export let ring = false;

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
		size="lg"
		{color}
		{ring}
	/>
	{#if nonNullish(tokenCount) && tokenCount > 0}
		<span
			class="token-count absolute -right-2.5 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-[0.5px] border-light-grey bg-white text-sm font-semibold"
		>
			{tokenCount}
		</span>
	{:else if showNetworkIcon}
		<div class="absolute -bottom-1 -right-1">
			<Logo
				src={networkIconBlackAndWhite ? networkIconBW : networkIcon}
				alt={replacePlaceholders($i18n.core.alt.logo, { $name: networkName })}
				{color}
			/>
		</div>
	{/if}
</div>

<style lang="scss">
	.token-count {
		color: var(--color-secondary);
	}
</style>
