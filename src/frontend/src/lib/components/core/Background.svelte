<script lang="ts">
	import background from '$lib/assets/background.svg';
	import Img from '$lib/components/ui/Img.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="fixed inset-0 z-[-1] overflow-hidden bg-white">
	<Img
		src={background}
		alt={replaceOisyPlaceholders($i18n.core.alt.background)}
		extraClass="min-w-[1280px] absolute left-1/2 top-0 transform -translate-x-1/2"
	/>
</div>
