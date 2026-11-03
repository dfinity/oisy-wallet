<!-- source: ISC Lucide - please visit https://lucide.dev/license -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '24' }: Props = $props();
</script>

<svg
	fill="none"
	height={size}
	stroke="currentColor"
	stroke-linecap="round"
	stroke-linejoin="round"
	stroke-width="2"
	viewBox="0 0 24 24"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
	/>
</svg>
