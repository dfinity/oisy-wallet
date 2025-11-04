<script lang="ts">
	import SeasonalIconAstronautHelmet from '$lib/components/core/SeasonalIconAstronautHelmet.svelte';
	import SeasonalOisyLogoLarge from '$lib/components/core/SeasonalOisyLogoLarge.svelte';
	import OisyLogoLarge from '$lib/components/icons/OisyLogoLarge.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let ariaLabel = $derived(replacePlaceholders($i18n.core.alt.logo, { $name: OISY_NAME }));
</script>

<div class="mr-3">
	<SeasonalIconAstronautHelmet />
</div>

<SeasonalOisyLogoLarge />
