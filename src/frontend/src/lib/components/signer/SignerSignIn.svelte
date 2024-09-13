<script lang="ts">
	import { IconWallet } from '@dfinity/gix-components';
	import IconArrowAstronaut from '$lib/components/icons/IconArrowAstronaut.svelte';
	import { signIn } from '$lib/services/auth.services';
	import { i18n } from '$lib/stores/i18n.store';
	import SignerAnimatedIconInfinite from '$lib/components/signer/SignerAnimatedIconInfinite.svelte';
</script>

<div class="flex justify-center pt-8">
	<SignerAnimatedIconInfinite />
</div>

<h2 class="text-center mt-12 mb-6">Connect to this app and many more</h2>

<button class="primary full center text-center h-14 px-12" on:click={async () => await signIn({})}
	>{$i18n.auth.text.authenticate} <IconArrowAstronaut /></button
>
