<!-- source: DFINITY foundation -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '24' }: Props = $props();
</script>

<svg fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
	<path
		clip-rule="evenodd"
		d="M9.5 1.25C10.5052 1.25 11.4038 1.70637 12 2.42321C12.5962 1.70637 13.4948 1.25 14.5 1.25H15C16.5188 1.25 17.75 2.48122 17.75 4C17.75 5.51878 16.5188 6.75 15 6.75H12.75H11.25H9C7.48122 6.75 6.25 5.51878 6.25 4C6.25 2.48122 7.48122 1.25 9 1.25H9.5ZM11.25 5.25V4.5C11.25 3.5335 10.4665 2.75 9.5 2.75H9C8.30964 2.75 7.75 3.30964 7.75 4C7.75 4.69036 8.30964 5.25 9 5.25H11.25ZM12.75 5.25H15C15.6904 5.25 16.25 4.69036 16.25 4C16.25 3.30964 15.6904 2.75 15 2.75H14.5C13.5335 2.75 12.75 3.5335 12.75 4.5V5.25Z"
		fill="currentColor"
		fill-rule="evenodd"
		opacity="0.3"
	/>
	<path
		d="M19.5 6H4.5C3.67157 6 3 6.67157 3 7.5V9.5C3 10.3284 3.67157 11 4.5 11H7.5H16.5H19.5C20.3284 11 21 10.3284 21 9.5V7.5C21 6.67157 20.3284 6 19.5 6Z"
		fill="currentColor"
	/>
	<path
		clip-rule="evenodd"
		d="M4 12.5V18C4 20.2091 5.79086 22 8 22H11.2L11.2 12.5H4ZM12.7 12.5L12.7 22H16C18.2091 22 20 20.2091 20 18V12.5H12.7Z"
		fill="currentColor"
		fill-rule="evenodd"
		opacity="0.3"
	/>
</svg>
