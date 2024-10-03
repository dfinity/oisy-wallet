<script lang="ts">
	import SignerAnimatedAstronaut from '$lib/components/signer/SignerAnimatedAstronaut.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex justify-center pt-12">
	<SignerAnimatedAstronaut />
</div>

<h2 class="mb-16 mt-12 text-center">{$i18n.signer.sign_in.text.authenticate_to_connect}</h2>

<ButtonAuthenticate fullWidth on:click={async () => await signIn({})} />
