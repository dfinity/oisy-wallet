<script lang="ts">
	import Send from '$lib/components/send/Send.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authSignedIn}
	<Send />
{/if}
