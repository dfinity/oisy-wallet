<script lang="ts">
	import OisyScanPayImg from '$lib/assets/oisy-scan-pay-img.webp';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import ImgBanner from '$lib/components/ui/ImgBanner.svelte';
	import { OISY_SCAN_URL, OISY_PAY_URL } from '$lib/constants/oisy.constants';
	import {
		OISY_SCANNER_INFO,
		OISY_SCANNER_INFO_GOT_IT_BUTTON
	} from '$lib/constants/test-ids.constants';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
	import { buildLearnMoreEvent } from '$lib/services/analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onButtonClick: () => void;
	}

	let { onButtonClick }: Props = $props();
</script>

<ContentWithToolbar testId={OISY_SCANNER_INFO}>
	<ImgBanner src={OisyScanPayImg} styleClass="max-h-60 rounded-lg mb-4" />

	<div class="mt-5 flex flex-col gap-3">
		<h3>{replaceOisyPlaceholders($i18n.scanner.text.what_is_scan_title)}</h3>

		<p class="mb-0 text-sm sm:text-base">
			<Html text={replaceOisyPlaceholders($i18n.scanner.text.what_is_scan_description)} />
		</p>

		<div>
			<ExternalLink
				ariaLabel={replaceOisyPlaceholders($i18n.scanner.text.learn_more_about_scan)}
				color="blue"
				href={OISY_SCAN_URL}
				iconAsLast
				iconSize="18"
				inline
				styleClass="font-medium"
				trackEvent={buildLearnMoreEvent({
					sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SCANNER,
					sourceSublocation: 'scan',
					labelKey: 'scanner.text.learn_more_about_scan',
					url: OISY_SCAN_URL
				})}
			>
				{replaceOisyPlaceholders($i18n.scanner.text.learn_more_about_scan)}
			</ExternalLink>
		</div>

		<div>
			<ExternalLink
				ariaLabel={replaceOisyPlaceholders($i18n.scanner.text.learn_more_about_pay)}
				color="blue"
				href={OISY_PAY_URL}
				iconAsLast
				iconSize="18"
				inline
				styleClass="font-medium"
				trackEvent={buildLearnMoreEvent({
					sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SCANNER,
					sourceSublocation: 'pay',
					labelKey: 'scanner.text.learn_more_about_pay',
					url: OISY_PAY_URL
				})}
			>
				{replaceOisyPlaceholders($i18n.scanner.text.learn_more_about_pay)}
			</ExternalLink>
		</div>
	</div>

	{#snippet toolbar()}
		<Button fullWidth onclick={onButtonClick} testId={OISY_SCANNER_INFO_GOT_IT_BUTTON}>
			{$i18n.core.text.got_it}
		</Button>
	{/snippet}
</ContentWithToolbar>
