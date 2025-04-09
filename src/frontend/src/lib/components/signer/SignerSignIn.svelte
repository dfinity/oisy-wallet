<script lang="ts">
	import ButtonAuthenticateWithLicense from '$lib/components/auth/ButtonAuthenticateWithLicense.svelte';
	import SignerAnimatedAstronaut from '$lib/components/signer/SignerAnimatedAstronaut.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import {modalAuthHelp, modalAuthHelpData} from "$lib/derived/modal.derived";
	import {nonNullish} from "@dfinity/utils";
	import AuthHelpModal from "$lib/components/auth/AuthHelpModal.svelte";
</script>

<div class="flex justify-center pt-12">
	<SignerAnimatedAstronaut />
</div>

<h2 class="mb-4 mt-12 text-center">
	{replaceOisyPlaceholders($i18n.signer.sign_in.text.access_your_wallet)}
</h2>

<p class="mb-12 text-center">{$i18n.signer.sign_in.text.open_or_create}</p>

<ButtonAuthenticateWithLicense fullWidth licenseAlignment="center" />

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}