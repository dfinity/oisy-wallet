<script lang="ts">
	import SeasonalIconAstronautHelmet from '$lib/components/core/SeasonalIconAstronautHelmet.svelte';
	import OisyLogoLarge from '$lib/components/icons/OisyLogoLarge.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let ariaLabel = $derived(replacePlaceholders($i18n.core.alt.logo, { $name: OISY_NAME }));
</script>

<div class="mr-3">
	<SeasonalIconAstronautHelmet />
</div>

<div class="invert-on-dark-theme logo-container hidden w-24 cursor-pointer xs:block">
	<OisyLogoLarge description={ariaLabel} />
</div>
