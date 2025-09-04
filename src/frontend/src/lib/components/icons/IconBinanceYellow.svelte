<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
		testId?: string;
	}

	let { size = '24', testId }: Props = $props();
</script>

<svg
	data-tid={testId}
	fill="none"
	height={size}
	viewBox="0 0 22 22"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<g clip-path="url(#clip0_10767_21883)">
		<path
			d="M11 22C17.0751 22 22 17.0751 22 11C22 4.92487 17.0751 0 11 0C4.92487 0 0 4.92487 0 11C0 17.0751 4.92487 22 11 22Z"
			fill="#F3BA2F"
		/>
		<g class="logo">
			<path
				d="M8.32975 9.90275L11 7.2325L13.6716 9.90413L15.2254 8.35038L11 4.125L6.776 8.349L8.32975 9.90275ZM4.125 11L5.67875 9.44625L7.2325 11L5.67875 12.5538L4.125 11ZM8.32975 12.0973L11 14.7675L13.6716 12.0959L15.2254 13.6489L11 17.875L6.776 13.651L6.77394 13.6489L8.32975 12.0973ZM14.7675 11L16.3212 9.44625L17.875 11L16.3212 12.5538L14.7675 11ZM12.5758 10.9986H12.5771V11L11 12.5771L9.42494 11.0027L9.42219 11L9.42494 10.9979L9.70062 10.7216L9.83469 10.5875L11 9.42288L12.5764 10.9993L12.5758 10.9986Z"
				fill="white"
			/>
		</g>
	</g>
</svg>
