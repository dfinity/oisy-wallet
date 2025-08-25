<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		styleClass?: string;
		size?: string;
	}

	let { styleClass, size = '24' }: Props = $props();
</script>

<svg
	class={styleClass}
	fill="none"
	height={size}
	viewBox="0 0 24 24"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M7 7L7 17M7 17L17 17M7 17L17 7"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
	/>
</svg>
