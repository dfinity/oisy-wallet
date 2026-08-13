<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string | number;
	}

	let { size = '20px' }: Props = $props();
</script>

<svg
	data-tid="icon-info"
	fill="none"
	height={size}
	viewBox="0 0 20 20"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M10.2222 17.5C14.3643 17.5 17.7222 14.1421 17.7222 10C17.7222 5.85786 14.3643 2.5 10.2222 2.5C6.08003 2.5 2.72217 5.85786 2.72217 10C2.72217 14.1421 6.08003 17.5 10.2222 17.5Z"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
	<path
		d="M10.2222 13.3333V10"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
	<path
		d="M10.2222 6.66699H10.2305"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
	/>
</svg>

<style lang="scss">
	svg {
		vertical-align: middle;
	}
</style>
