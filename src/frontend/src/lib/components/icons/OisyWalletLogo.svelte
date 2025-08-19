<script lang="ts">
	import oisyLogoLarge from '$lib/assets/oisy-logo-large.svg';
	import oisyLogoSmall from '$lib/assets/oisy-logo-small.svg';
	import IconAstronautHelmet from '$lib/components/icons/IconAstronautHelmet.svelte';
	import Img from '$lib/components/ui/Img.svelte';
	import { OISY_NAME } from '$lib/constants/oisy.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	let ariaLabel = $derived(replacePlaceholders($i18n.core.alt.logo, { $name: OISY_NAME }));
</script>

<div class="mr-3">
	<IconAstronautHelmet />
</div>

<picture class="invert-on-dark-theme hidden w-24 xs:block" aria-label={ariaLabel}>
	<source media="(max-width: 639px)" srcset={oisyLogoSmall} />
	<Img alt={ariaLabel} src={oisyLogoLarge} />
</picture>
