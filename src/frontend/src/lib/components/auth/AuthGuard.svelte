<script lang="ts">
	import LandingPage from '$lib/components/auth/LandingPage.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authNotSignedIn}
	<LandingPage />
{:else}
	<slot />
{/if}
