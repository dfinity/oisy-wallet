<script>
	import { authSignedIn } from '$lib/derived/auth.derived';
	import SettingsSignedIn from '$lib/components/settings/SettingsSignedIn.svelte';
	import SettingsSignedOut from '$lib/components/settings/SettingsSignedOut.svelte';
	import SettingsVersion from '$lib/components/settings/SettingsVersion.svelte';
</script>

{#if $authSignedIn}
	<SettingsSignedIn />
{:else}
	<SettingsSignedOut />
{/if}

<SettingsVersion />
