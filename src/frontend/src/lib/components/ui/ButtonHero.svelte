<script lang="ts">
	import Img from '$lib/components/ui/Img.svelte';

	export let button: HTMLButtonElement | undefined = undefined;
	export let ariaLabel: string;
	export let imgSrc: string;
	export let imgAlt: string;
</script>

<button class="token icon desktop-wide" bind:this={button} on:click aria-label={ariaLabel}>
	<span class="block w-[22px] h-[22px]">
		<Img src={imgSrc} alt={imgAlt} width="100%" height="100%" rounded />
	</span>
	<span class="text-black font-bold"><slot /></span>
</button>
