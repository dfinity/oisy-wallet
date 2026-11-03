<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string | number;
	}

	let { size = '20px' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 20 20" width={size} xmlns="http://www.w3.org/2000/svg">
	<circle cx="10" cy="5.83333" r="3.33333" stroke="currentColor" stroke-width="1.5" />
	<path
		d="M12.5 11.667H7.50004C5.19886 11.667 3.13762 13.7919 4.65211 15.5244C5.68203 16.7026 7.38522 17.5003 10 17.5003C12.6149 17.5003 14.3181 16.7026 15.348 15.5244C16.8625 13.7919 14.8012 11.667 12.5 11.667Z"
		stroke="currentColor"
		stroke-width="1.5"
	/>
</svg>
