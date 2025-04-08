<script lang="ts">
	import { fade } from 'svelte/transition';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import LandingPage from '$lib/components/auth/LandingPage.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
	import { modalAuthHelp } from '$lib/derived/modal.derived';
</script>

{#if $authNotSignedIn}
	<LandingPage />
{:else}
	<div in:fade class="md:block md:overflow-y-auto">
		<slot />
	</div>
{/if}

{#if $modalAuthHelp}
	<AuthHelpModal />
{/if}
