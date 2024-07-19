<script lang="ts">
	export let openModal: () => void;
	export let asMenuItem = false;
</script>

<button
	class={asMenuItem ? '' : 'text-center text-white text-lg font-bold px-4 whitespace-nowrap'}
	on:click={openModal}
	on:click
>
	<slot name="label"></slot>
</button>
