<script lang="ts">
	import IconEast from '$lib/components/icons/IconEast.svelte';
	import IconWest from '$lib/components/icons/IconWest.svelte';
	import ButtonControl from '$lib/components/ui/ButtonControl.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		onNext: () => void;
		onPrevious: () => void;
	}

	let { onNext, onPrevious }: Props = $props();
</script>

<div class="mr-3 flex items-center">
	<ButtonControl ariaLabel={$i18n.carousel.text.prev_slide} onclick={onPrevious} styleClass="mr-1">
		<IconWest />
	</ButtonControl>
	<ButtonControl ariaLabel={$i18n.carousel.text.next_slide} onclick={onNext}>
		<IconEast />
	</ButtonControl>
</div>
