<script lang="ts">
	import SignIn from '$lib/components/auth/SignInLayout.svelte';
	import { authNotSignedIn } from '$lib/derived/auth.derived';
</script>

{#if $authNotSignedIn}
	<SignIn />
{:else}
	<slot />
{/if}
