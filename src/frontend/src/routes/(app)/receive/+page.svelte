<script lang="ts">
	import Receive from '$lib/components/receive/Receive.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authSignedIn}
	<Receive />
{/if}
