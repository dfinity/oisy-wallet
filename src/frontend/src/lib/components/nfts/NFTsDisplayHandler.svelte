<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';

	interface Props {
		nfts: TokenUiOrGroupUi,
		children: Snippet
	}

	let { nfts = $bindable(), children }: Props = $props();
</script>

{@render children()}