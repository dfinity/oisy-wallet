<script lang="ts">
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onclick: () => void;
		fullWidth?: boolean;
	}

	let { onclick, fullWidth }: Props = $props();
</script>

<div
	class="mt-2 flex w-full items-center justify-center gap-2 text-sm font-bold text-brand-primary"
	class:sm:w-80={!fullWidth}
>
	<ExternalLink
		ariaLabel={$i18n.auth.text.sign_in_with_identity_number}
		href={OISY_INTERNET_IDENTITY_VERSION_2_0_DOCS_URL}
		iconVisible={false}
	>
		<IconHelp size="18" />
	</ExternalLink>

	<button aria-label={$i18n.auth.text.sign_in_with_identity_number} {onclick}>
		{$i18n.auth.text.sign_in_with_identity_number}
	</button>
</div>
