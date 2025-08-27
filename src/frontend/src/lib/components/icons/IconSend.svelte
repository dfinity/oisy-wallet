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
		d="M17.5 9.65692L11.8431 4.00007M11.8431 4.00007L6.18628 9.65692M11.8431 4.00007V15.3138"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
	/>
	<line
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		x1="5.5"
		x2="18.5"
		y1="19"
		y2="19"
	/>
</svg>
