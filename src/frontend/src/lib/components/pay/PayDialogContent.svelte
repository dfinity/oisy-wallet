<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import { OPEN_CRYPTO_PAY_ECOSYSTEM_URL } from '$lib/constants/open-crypto-pay.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="flex flex-col gap-2">
	<p class="mt-2 mb-0 text-sm sm:text-base">
		<Html text={replaceOisyPlaceholders($i18n.pay.text.dialog_description)} />
	</p>

	<div class="items-center text-left font-medium">
		<ExternalLink
			ariaLabel={$i18n.pay.alt.where_you_can_pay}
			color="blue"
			href={OPEN_CRYPTO_PAY_ECOSYSTEM_URL}
			iconAsLast
			iconSize="18"
			inline
		>
			{replaceOisyPlaceholders($i18n.pay.text.where_you_can_pay)}
		</ExternalLink>
	</div>
</div>
