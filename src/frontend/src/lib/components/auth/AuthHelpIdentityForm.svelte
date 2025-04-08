<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import helpAuthIdentityBanner from '$lib/assets/help-auth-identity-banner.svg';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonDone from '$lib/components/ui/ButtonDone.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_DOCS_URL } from '$lib/constants/oisy.constants';
	import { HELP_AUTH_IDENTITY_IMAGE_BANNER } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let onBack: () => void;
	export let onDone: () => void;
</script>

<ContentWithToolbar>
	<div class="grid gap-6">
		<Img
			src={helpAuthIdentityBanner}
			styleClass="w-full"
			testId={HELP_AUTH_IDENTITY_IMAGE_BANNER}
		/>

		<div>
			<p>
				<Html text={replaceOisyPlaceholders($i18n.auth.help.text.identity_new_identity)} />
			</p>
			<p>
				{$i18n.auth.help.text.identity_legacy_description}
			</p>
			<p>
				<ExternalLink
					iconVisible={false}
					styleClass="font-semibold"
					ariaLabel={$i18n.auth.help.alt.identity_legacy_sign_in}
					href=""
				>
					{$i18n.auth.help.text.identity_legacy_sign_in}
				</ExternalLink>
			</p>
			<p class="mb-0">
				<ExternalLink
					styleClass="font-semibold flex flex-row-reverse"
					ariaLabel={$i18n.auth.help.alt.identity_learn_more}
					href={OISY_DOCS_URL}
				>
					{replaceOisyPlaceholders($i18n.auth.help.text.identity_learn_more)}
				</ExternalLink>
			</p>
		</div>
	</div>

	<ButtonGroup slot="toolbar">
		<ButtonBack on:click={onBack} />
		<ButtonDone on:click={onDone} />
	</ButtonGroup>
</ContentWithToolbar>
