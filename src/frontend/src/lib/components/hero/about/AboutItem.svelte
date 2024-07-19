<script lang="ts">
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';

	export let labelAsTitle: string;
	export let labelAsMenuItem: string;
	export let openModal: () => void;
	export let asMenuItem = false;
	export let onClick: (() => void) | undefined = undefined;

	const handleClick = () => {
		openModal();
		onClick?.();
	};
</script>

<button
	class={asMenuItem ? '' : 'text-center text-white text-lg font-bold px-4 whitespace-nowrap'}
	on:click={handleClick}
>
	<span>{replaceOisyPlaceholders(asMenuItem ? labelAsMenuItem : labelAsTitle)}</span>
</button>
