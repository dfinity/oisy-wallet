<script lang="ts">
	import SignerAnimatedIconInfinite from '$lib/components/signer/SignerAnimatedIconInfinite.svelte';
	import ButtonAuthenticate from '$lib/components/ui/ButtonAuthenticate.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex justify-center pt-12">
	<SignerAnimatedIconInfinite />
</div>

<h2 class="text-center mt-12 mb-16">{$i18n.signer.sign_in.text.authenticate_to_connect}</h2>

<ButtonAuthenticate fullWidth on:click={async () => await signIn({})}>
	{$i18n.auth.text.authenticate}
</ButtonAuthenticate>
