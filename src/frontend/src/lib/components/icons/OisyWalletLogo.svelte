<script lang="ts">
	import oisyLogoSmall from '$lib/assets/oisy-logo-small.svg';
	import IconAstronautHelmetHalloween from '$lib/components/icons/IconAstronautHelmetHalloween.svelte';
	import OisyLogoLarge from '$lib/components/icons/OisyLogoLarge.svelte';
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
<div
	class="invert-on-dark-theme logo-container block w-16 cursor-pointer xs:hidden"
	aria-label={ariaLabel}
>
	<Img alt={ariaLabel} src={oisyLogoSmall} />
</div>

<!-- Large animated logo for larger screens -->
<div
	class="invert-on-dark-theme logo-container hidden w-24 cursor-pointer xs:block"
	aria-label={ariaLabel}
>
	<OisyLogoLarge />
</div>
