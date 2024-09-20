<script lang="ts">
	import background from '$lib/assets/background.svg';
	import { i18n } from '$lib/stores/i18n.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
</script>

<div class="fixed inset-0 z-[-1] overflow-hidden bg-white">
	<img
		src=""
		srcset="{background} 1280w"
		sizes="(min-width: 640px) 100vw, 0vw"
		alt={replaceOisyPlaceholders($i18n.core.alt.background)}
		class="absolute left-1/2 top-0 hidden min-w-[1280px] -translate-x-1/2 transform sm:block"
	/>
</div>
