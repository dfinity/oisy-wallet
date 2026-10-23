<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import AuthHelpModal from '$lib/components/auth/AuthHelpModal.svelte';
	import ButtonAuthenticateWithHelp from '$lib/components/auth/ButtonAuthenticateWithHelp.svelte';
	import SettingsVersion from '$lib/components/settings/SettingsVersion.svelte';
	import { modalAuthHelp, modalAuthHelpData } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<!-- One wrapper, so the layout's gap does not push the sentence away from its heading. The layout's logo is the only logo on this screen. -->
<div>
	<h2 class="mb-2 text-center [font-size:var(--font-size-h3)] sm:[font-size:var(--font-size-h2)]">
		{replaceOisyPlaceholders($i18n.signer.sign_in.text.connect_your_wallet)}
	</h2>

	<p class="mb-8 text-center">{$i18n.signer.sign_in.text.open_or_create}</p>

	<ButtonAuthenticateWithHelp asPopup fullWidth helpAlignment="center" needHelpLink={false} />

	<div class="mt-6 [&_p]:mb-0">
		<SettingsVersion />
	</div>
</div>

{#if $modalAuthHelp && nonNullish($modalAuthHelpData)}
	<AuthHelpModal usesIdentityHelp={$modalAuthHelpData} />
{/if}
