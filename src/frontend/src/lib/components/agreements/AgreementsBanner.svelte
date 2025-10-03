<script lang="ts">
	import { Html, IconClose } from '@dfinity/gix-components';
	import { notEmptyString } from '@dfinity/utils';
	import WarningBanner from '$lib/components/ui/WarningBanner.svelte';
	import {
		AGREEMENTS_WARNING_BANNER,
		AGREEMENTS_WARNING_BANNER_CLOSE_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import type { AgreementsToAccept } from '$lib/types/user-agreements';
	import { formatUpdatedAgreementsHtml } from '$lib/utils/agreements-formatter.utils';
	import { replaceOisyPlaceholders, replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		agreementsToAccept: AgreementsToAccept;
	}

	let { agreementsToAccept }: Props = $props();

	let visible = $state(true);

	const close = () => (visible = false);

	let formattedAgreements = $derived(
		formatUpdatedAgreementsHtml({
			agreements: agreementsToAccept,
			i18n: $i18n
		})
	);

	let warning = $derived(
		notEmptyString(formattedAgreements)
			? replacePlaceholders(
					replaceOisyPlaceholders($i18n.agreements.text.updated_agreements_warning),
					{
						$agreements: formattedAgreements
					}
				)
			: ''
	);
</script>

{#if visible && notEmptyString(warning)}
	<WarningBanner testId={AGREEMENTS_WARNING_BANNER}>
		<span class="w-full px-2"><Html text={warning} /></span>
		<button
			aria-label={$i18n.core.text.close}
			data-tid={AGREEMENTS_WARNING_BANNER_CLOSE_BUTTON}
			onclick={close}
		>
			<IconClose />
		</button>
	</WarningBanner>
{/if}
