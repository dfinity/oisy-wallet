<script>
	import DappsExplorerSignedIn from '$lib/components/dapps/DappsExplorerSignedIn.svelte';
	import DappsExplorerSignedOut from '$lib/components/dapps/DappsExplorerSignedOut.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authSignedIn}
	<DappsExplorerSignedIn />
{:else}
	<DappsExplorerSignedOut />
{/if}
