<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { CardData } from '$lib/types/token-card';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	export let data: CardData;
	export let color: 'dust' | 'off-white' | 'white' = 'dust';
	export let subLogo:
		| { type: 'network'; blackAndWhite?: boolean }
		| { type: 'tokenCount'; count: number }
		| undefined = undefined;
	export let ring = false;

	const {
		icon,
		name,
		network: { name: networkName, icon: networkIcon, iconBW: networkIconBW }
	} = data;
</script>

<div class="relative">
	<Logo
		src={icon}
		alt={replacePlaceholders($i18n.core.alt.logo, { $name: name })}
		size="lg"
		{color}
		{ring}
	/>
	{#if subLogo?.type === 'tokenCount' && subLogo.count > 0}
		<span
			class="absolute -right-2.5 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-[0.5px] border-light-grey bg-white text-sm font-semibold text-[var(--color-secondary)]"
			aria-label={replacePlaceholders($i18n.tokens.alt.token_group_number, { $token: data.name })}
		>
			{subLogo.count}
		</span>
	{:else if subLogo?.type === 'network'}
		<div class="absolute -bottom-1 -right-1">
			<Logo
				src={subLogo.blackAndWhite ? networkIconBW : networkIcon}
				alt={replacePlaceholders($i18n.core.alt.logo, { $name: networkName })}
				{color}
			/>
		</div>
	{/if}
</div>
