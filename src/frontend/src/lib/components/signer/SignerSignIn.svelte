<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import SignerAnimatedAstronaut from '$lib/components/signer/SignerAnimatedAstronaut.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_SIGNER_CONNECT_DOCS_URL } from '$lib/constants/oisy.constants';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="flex justify-center pt-3 sm:pt-7">
	<SignerAnimatedAstronaut />
</div>

<h2 class="mt-9 mb-2 text-center">
	{replaceOisyPlaceholders($i18n.signer.sign_in.text.connect_your_wallet)}
</h2>

<p class="mb-4 text-center">{$i18n.signer.sign_in.text.open_or_create}</p>

<p class="mb-12 text-center">
	<strong class="inline-flex items-center gap-1"
		><span class="text-success-primary"><IconShieldCheck size="16" /></span>{$i18n.signer.sign_in.text.oisy_protects_you}</strong
	>
	{$i18n.signer.sign_in.text.oisy_protects_you_description}
	<ExternalLink
		ariaLabel={$i18n.core.alt.learn_more}
		href={OISY_SIGNER_CONNECT_DOCS_URL}
		iconVisible={false}
		styleClass="ml-[1.25em]"
	>
		{$i18n.core.text.learn_more}
	</ExternalLink>
</p>

<ButtonAuthenticateWithHelp asPopup fullWidth helpAlignment="center" needHelpLink={false} />

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}
