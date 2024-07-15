<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import { signIn } from '$lib/services/auth.services';
	import ButtonIC from '$lib/components/ui/ButtonIC.svelte';
	import About from '$lib/components/hero/About.svelte';
</script>

<div class="mt-6 xl:mt-12 mb-0.5 pt-2">
	<h1 class="text-off-white text-5xl max-w-[15rem]">
		{$i18n.auth.text.connect_to_oisy}
	</h1>

	<About />
</div>

<ButtonIC on:click={async () => await signIn({})} testId="login-button">
	<svelte:fragment slot="action">{$i18n.auth.text.authenticate_with}</svelte:fragment>
	Internet Identity
</ButtonIC>
