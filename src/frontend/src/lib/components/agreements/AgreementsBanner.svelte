<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import { notEmptyString } from '@dfinity/utils';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import { AGREEMENTS_WARNING_BANNER } from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { agreementsToAccept } from '$lib/derived/user-agreements.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatUpdatedAgreementsHtml } from '$lib/utils/agreements.utils';

	let visible = $state(true);

	const close = () => (visible = false);

	let formattedAgreements = $derived(
		formatUpdatedAgreementsHtml({
			agreements: $agreementsToAccept,
			i18n: $i18n,
			language: $currentLanguage
		})
	);

	let warning = $derived(notEmptyString(formattedAgreements) ? '' : '');
</script>

{#if visible && notEmptyString(warning)}
	<WarningBanner testId={AGREEMENTS_WARNING_BANNER}>
		<span class="w-full px-2">{warning}</span>
		<button aria-label={$i18n.core.text.close} onclick={close}>
			<IconClose />
		</button>
	</WarningBanner>
{/if}
