<script>
	import { authSignedIn } from '$lib/derived/auth.derived';
	import SettingsSignedIn from '$lib/components/pages/SettingsSignedIn.svelte';
	import SettingsSignedOut from '$lib/components/pages/SettingsSignedOut.svelte';
</script>

{#if $authSignedIn}
	<SettingsSignedIn />
{:else}
	<SettingsSignedOut />
{/if}
