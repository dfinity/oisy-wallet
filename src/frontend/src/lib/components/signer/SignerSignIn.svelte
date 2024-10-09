<script lang="ts">
	import SignerAnimatedAstronaut from '$lib/components/signer/SignerAnimatedAstronaut.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="flex justify-center pt-12">
	<SignerAnimatedAstronaut />
</div>

<h2 class="mb-4 mt-12 text-center">
	{replaceOisyPlaceholders($i18n.signer.sign_in.text.access_your_wallet)}
</h2>

<p class="mb-12 text-center">{$i18n.signer.sign_in.text.open_or_create}</p>

<ButtonAuthenticate fullWidth on:click={async () => await signIn({})} />
