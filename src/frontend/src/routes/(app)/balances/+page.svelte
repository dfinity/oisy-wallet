<script lang="ts">
	import Tokens from '$lib/components/tokens/Tokens.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authSignedIn}
	<Tokens />
{/if}
