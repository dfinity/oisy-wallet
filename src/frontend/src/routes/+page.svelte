<script lang="ts">
	import { authSignedInStore, authStore } from '$lib/stores/auth.store';
</script>

{#if $authSignedInStore}
	<button on:click={authStore.signOut}>Sign-out</button>
{:else}
	<button on:click={authStore.signIn}>Sign-in</button>
{/if}
