<script>
	import { authSignedIn } from '$lib/derived/auth.derived';
	import DAppsSignedIn from '$lib/components/dapps/DAppsSignedIn.svelte';
	import DAppsSignedOut from '$lib/components/dapps/DAppsSignedOut.svelte';
</script>

{#if $authSignedIn}
	<DAppsSignedIn />
{:else}
	<DAppsSignedOut />
{/if}
