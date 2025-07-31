<script lang="ts">
	import OisyWalletLogo from '$lib/components/icons/OisyWalletLogo.svelte';
	import { NAVIGATION_ITEM_HOMEPAGE } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<a
	class="flex w-fit items-center gap-0 no-underline"
	aria-label={replaceOisyPlaceholders($i18n.core.alt.go_to_home)}
	data-tid={NAVIGATION_ITEM_HOMEPAGE}
	href="/"
>
	<OisyWalletLogo />
</a>
