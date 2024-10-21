<script>
	import { authSignedIn } from '$lib/derived/auth.derived';
	import DappsExplorerSignedIn from '$lib/components/dapps/DappsExplorerSignedIn.svelte';
	import DappsExplorerSignedOut from '$lib/components/dapps/DappsExplorerSignedOut.svelte';
</script>

{#if $authSignedIn}
	<DappsExplorerSignedIn />
{:else}
	<DappsExplorerSignedOut />
{/if}
