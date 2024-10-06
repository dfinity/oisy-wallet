<script lang="ts">
	import Convert from '$lib/components/convert/Convert.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authSignedIn}
	<Convert />
{/if}
