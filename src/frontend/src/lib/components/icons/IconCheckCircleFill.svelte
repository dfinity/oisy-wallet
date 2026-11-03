<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string | number;
	}

	let { size = 20 }: Props = $props();
</script>

<svg
	fill="currentColor"
	height={size}
	viewBox="0 0 20 20"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M10 1.75a8.25 8.25 0 1 1 0 16.5 8.25 8.25 0 0 1 0-16.5Zm3.98 5.857a.75.75 0 0 0-1.003-.075l-.057.05-4.068 3.88L7.08 9.77l-.059-.051a.75.75 0 0 0-1.03 1.079l.052.056 2.289 2.187.116.09a.75.75 0 0 0 .92-.089l4.586-4.375.053-.056a.75.75 0 0 0-.027-1.005Z"
	/>
</svg>
