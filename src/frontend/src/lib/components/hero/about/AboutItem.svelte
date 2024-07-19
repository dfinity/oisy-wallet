<script lang="ts">
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
	<slot name="label"></slot>
</button>
