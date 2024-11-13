<script lang="ts">
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import type { LogoSize } from '$lib/types/components';
	import type { Token } from '$lib/types/token';

	export let token: Token;
	export let size: Extract<LogoSize, 'md' | 'xs'> = 'xs';
</script>

<div class="flex items-center">
	<TokenLogo data={token} logoSize={size} />

	<!-- TODO: Update colors with values from theme-variables when they are available there -->
	<span class={`${size === 'md' ? 'text-3xl font-bold' : 'text-aurometalsaurus'} ml-2 `}
		>{token.symbol}</span
	>
</div>
