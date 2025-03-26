<script lang="ts">
	import oisyLogoLarge from '$lib/assets/oisy-logo-large.svg';
	import oisyLogoSmall from '$lib/assets/oisy-logo-small.svg';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let ariaLabel: string;
	$: ariaLabel = replacePlaceholders($i18n.core.alt.logo, { $name: OISY_NAME });
</script>

<div class="mr-3">
	<IconAstronautHelmet />
</div>

<picture aria-label={ariaLabel} class="invert-on-dark-theme hidden w-24 xs:block">
	<source srcset={oisyLogoSmall} media="(max-width: 639px)" />
	<Img src={oisyLogoLarge} alt={ariaLabel} />
</picture>
