<script lang="ts">
	import { IconWest, IconEast } from '@dfinity/gix-components';
	import ButtonControl from '$lib/components/ui/ButtonControl.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let onNext: () => void;
	export let onPrevious: () => void;
</script>

<div class="mr-3 flex items-center">
	<ButtonControl ariaLabel={$i18n.carousel.text.prev_slide} styleClass="mr-1" onclick={onPrevious}>
		<IconWest />
	</ButtonControl>
	<ButtonControl ariaLabel={$i18n.carousel.text.next_slide} onclick={onNext}>
		<IconEast />
	</ButtonControl>
</div>
