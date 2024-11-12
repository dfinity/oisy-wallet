<script lang="ts">
	import Logo from '$lib/components/ui/Logo.svelte';
	import { i18n } from '$lib/stores/i18n.store.js';
	import type { LogoSize } from '$lib/types/components';
	import type { Token } from '$lib/types/token';
	import { replacePlaceholders } from '$lib/utils/i18n.utils.js';

	export let token: Token;
	export let size: Extract<LogoSize, 'md' | 'xs'> = 'xs';
</script>

<div class="flex items-center">
	<Logo
		src={token.icon}
		alt={replacePlaceholders($i18n.core.alt.logo, { $name: token.name })}
		{size}
	/>

	<!-- TODO: Update colors with values from theme-variables when they are available there -->
	<span class={`${size === 'md' ? 'text-3xl font-bold' : 'text-aurometalsaurus'} ml-2 `}
		>{token.symbol}</span
	>
</div>
