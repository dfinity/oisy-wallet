<script lang="ts">
	import oisyLogoSmall from '$lib/assets/oisy-logo-small.svg';
	import OisyLogoLarge from '$lib/components/icons/oisyLogoLarge.svelte';
	import IconAstronautHelmetHalloween from '$lib/components/icons/IconAstronautHelmetHalloween.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let ariaLabel = $derived(replacePlaceholders($i18n.core.alt.logo, { $name: OISY_NAME }));
</script>

<div class="mr-3">
	<IconAstronautHelmetHalloween />
</div>

<!-- Small logo for mobile screens -->
<div class="invert-on-dark-theme block w-16 xs:hidden logo-container" aria-label={ariaLabel}>
	<Img src={oisyLogoSmall} alt={ariaLabel} />
</div>

<!-- Large animated logo for larger screens -->
<div class="invert-on-dark-theme hidden w-24 xs:block logo-container" aria-label={ariaLabel}>
	<OisyLogoLarge />
</div>

<style>
	.logo-container {
		cursor: pointer;
	}
</style>
