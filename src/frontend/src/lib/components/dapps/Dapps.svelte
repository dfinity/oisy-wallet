<script>
	import { authSignedIn } from '$lib/derived/auth.derived';
	import DappsSignedOut from '$lib/components/dapps/DappsSignedOut.svelte';
	import DappsSignedIn from '$lib/components/dapps/DappsSignedIn.svelte';
</script>

{#if $authSignedIn}
	<DappsSignedIn />
{:else}
	<DappsSignedOut />
{/if}
