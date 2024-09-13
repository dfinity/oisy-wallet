<script lang="ts">
	import IconArrowAstronaut from '$lib/components/icons/IconArrowAstronaut.svelte';
	import SignerAnimatedIconInfinite from '$lib/components/signer/SignerAnimatedIconInfinite.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
</script>

<div class="flex justify-center pt-8">
	<SignerAnimatedIconInfinite />
</div>

<h2 class="text-center mt-12 mb-6">Authenticate to connect</h2>

<button class="primary full center text-center h-14 px-12" on:click={async () => await signIn({})}
	>{$i18n.auth.text.authenticate} <IconArrowAstronaut /></button
>
