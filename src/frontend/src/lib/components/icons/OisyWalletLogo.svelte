<script lang="ts">
	// TO REVERT BACK after New Year Holidays
	// import oisyLogoLarge from '$lib/assets/oisy-logo-large.svg';
	// import oisyLogoSmall from '$lib/assets/oisy-logo-small.svg';
	import oisyLogoLargeNewYear from '$lib/assets/oisy-logo-large-new-year.svg';
	import oisyLogoSmallNewYear from '$lib/assets/oisy-logo-small-new-year.svg';
	import IconAstronautHelmetNewYear from '$lib/components/icons/IconAstronautHelmetNewYear.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let ariaLabel: string;
	$: ariaLabel = replacePlaceholders($i18n.core.alt.logo, { $name: OISY_NAME });
</script>

<div class="mr-3">
	<IconAstronautHelmetNewYear />
</div>

<picture aria-label={ariaLabel} class="w-24">
	<source srcset={oisyLogoSmallNewYear} media="(max-width: 639px)" />
	<Img src={oisyLogoLargeNewYear} alt={ariaLabel} />
</picture>
