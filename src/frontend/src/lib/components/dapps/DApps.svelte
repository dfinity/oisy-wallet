<script>
	import DAppsSignedIn from '$lib/components/dapps/DAppsSignedIn.svelte';
	import DAppsSignedOut from '$lib/components/dapps/DAppsSignedOut.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authSignedIn}
	<DAppsSignedIn />
{:else}
	<DAppsSignedOut />
{/if}
