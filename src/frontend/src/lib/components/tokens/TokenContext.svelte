<script lang="ts">
	import { setContext } from 'svelte';
	import { initTokenStore } from '$lib/stores/token.store';

	const tokenContextKey = {};

	const tokenStore = initTokenStore();
	setContext(tokenContextKey, tokenStore);
</script>

<slot />
