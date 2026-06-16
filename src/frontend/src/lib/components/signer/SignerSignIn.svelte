<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import IconShieldCheck from '$lib/components/icons/lucide/IconShieldCheck.svelte';
	import SettingsVersion from '$lib/components/settings/SettingsVersion.svelte';
	import SignerAnimatedAstronaut from '$lib/components/signer/SignerAnimatedAstronaut.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_SIGNER_CONNECT_DOCS_URL } from '$lib/constants/oisy.constants';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { buildLearnMoreEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="flex justify-center pt-3 sm:pt-7">
	<SignerAnimatedAstronaut />
</div>

<h2
	class="mt-5 mb-2 text-center [font-size:var(--font-size-h3)] sm:mt-9 sm:[font-size:var(--font-size-h2)]"
>
	{replaceOisyPlaceholders($i18n.signer.sign_in.text.connect_your_wallet)}
</h2>

<p class="mb-4 text-center">{$i18n.signer.sign_in.text.open_or_create}</p>

<p class="mb-12 text-center">
	<strong
		><span class="text-success-primary relative -top-px mr-1 inline-block align-middle"
			><IconShieldCheck size="16" /></span
		>{replaceOisyPlaceholders($i18n.core.text.oisy_protects_you)}</strong
	>
	{$i18n.signer.sign_in.text.oisy_protects_you_description}
	<ExternalLink
		ariaLabel={$i18n.core.alt.learn_more}
		href={OISY_SIGNER_CONNECT_DOCS_URL}
		iconVisible={false}
		styleClass="ml-[1.25em]"
		trackEvent={buildLearnMoreEvent({
			sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SIGNER,
			labelKey: 'core.text.learn_more',
			url: OISY_SIGNER_CONNECT_DOCS_URL
		})}
	>
		{$i18n.core.text.learn_more}
	</ExternalLink>
</p>

<ButtonAuthenticateWithHelp asPopup fullWidth helpAlignment="center" needHelpLink={false} />

<div class="[&_p]:mb-0">
	<SettingsVersion />
</div>

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}
