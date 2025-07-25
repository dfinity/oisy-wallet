<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		styleClass?: string;
		size?: string;
	}

	let { styleClass, size = '24' }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	class={styleClass}
	viewBox="0 0 24 24"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M16 11L20 7M20 7L16 3M20 7L4 7M8 13L4 17M4 17L8 21M4 17L20 17"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
