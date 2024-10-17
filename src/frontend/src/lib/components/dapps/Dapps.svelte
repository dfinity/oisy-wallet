<script>
	import DappsSignedIn from '$lib/components/dapps/DappsSignedIn.svelte';
	import DappsSignedOut from '$lib/components/dapps/DappsSignedOut.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authSignedIn}
	<DappsSignedIn />
{:else}
	<DappsSignedOut />
{/if}
