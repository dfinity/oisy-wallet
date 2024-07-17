<script lang="ts">
	import { setContext } from 'svelte';
	import { initTokenStore, TOKEN_CONTEXT_KEY, type TokenData } from '$lib/stores/token.store';

	export let token: TokenData;

	const tokenStore = initTokenStore(token);
	setContext(TOKEN_CONTEXT_KEY, tokenStore);
</script>

<slot />
