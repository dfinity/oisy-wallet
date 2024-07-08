<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store.js';
	import { signIn } from '$lib/services/auth.services';
	import ButtonIC from '$lib/components/ui/ButtonIC.svelte';
</script>

<h1 class="text-off-white text-6xl">
	{$i18n.auth.text.connect_to_oisy}
</h1>

<span class="text-off-white block my-4">{$i18n.auth.text.title}</span>

<ButtonIC on:click={async () => await signIn({})} testId="login-button">
	<svelte:fragment slot="action">{$i18n.auth.text.connect_with}</svelte:fragment>
	Internet Identity
</ButtonIC>
