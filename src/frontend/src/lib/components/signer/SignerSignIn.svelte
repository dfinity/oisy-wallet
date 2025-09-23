<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import SignerAnimatedAstronaut from '$lib/components/signer/SignerAnimatedAstronaut.svelte';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="flex justify-center pt-7">
	<SignerAnimatedAstronaut />
</div>

<h2 class="mb-2 mt-9 text-center">
	{replaceOisyPlaceholders($i18n.signer.sign_in.text.access_your_wallet)}
</h2>

<p class="mb-12 text-center">{$i18n.signer.sign_in.text.open_or_create}</p>

<ButtonAuthenticateWithHelp fullWidth needHelpLink={false} />

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}
