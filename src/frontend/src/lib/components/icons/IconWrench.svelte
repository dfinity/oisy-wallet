<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '24' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
	<path
		d="M3.59 17.23L12.25 8.57L15.43 11.75L6.77 20.41A2.25 2.25 0 0 1 3.59 17.23Z"
		fill="currentColor"
		opacity="0.35"
	/>
	<path d="M18.56 3.5A4.75 4.75 0 1 0 20.5 5.44L16.76 9.19L14.81 7.24Z" fill="currentColor" />
</svg>
