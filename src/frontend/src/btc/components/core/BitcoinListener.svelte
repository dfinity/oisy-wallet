<!-- TODO: Implement https://dfinity.atlassian.net/browse/GIX-2884 -->
<script lang="ts">
	import type { Token } from '$lib/types/token';

	// eslint-disable-next-line svelte/valid-compile
	export let token: Token;
</script>

<slot />
