<script lang="ts">
	import { authSignedInStore } from '$lib/stores/auth.store';
	import { signIn, signOut } from '$lib/services/auth.services';
	import Hello from '$lib/components/EthAddress.svelte';
</script>

{#if $authSignedInStore}
	<Hello />

	<button on:click={signOut}>Sign-out</button>
{:else}
	<button on:click={signIn}>Sign-in</button>
{/if}
