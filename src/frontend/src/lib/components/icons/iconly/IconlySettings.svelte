<!-- source: ICONLY PRO - The license is bought and owned by the DFINITY Foundation - Please read the documentation in the README file, or see terms and conditions here https://iconly.pro/pages/terms -->
<script lang="ts">
	interface Props {
		size?: string;
	}

	let { size = '24' }: Props = $props();
</script>

<svg
	fill="currentColor"
	height={size}
	viewBox="0 0 24 24"
	width={size}
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		clip-rule="evenodd"
		d="M6.63 10.3045C8.356 10.3045 9.76 8.90852 9.76 7.19352C9.76 5.47752 8.356 4.08252 6.63 4.08252C4.904 4.08252 3.5 5.47752 3.5 7.19352C3.5 8.90852 4.904 10.3045 6.63 10.3045Z"
		fill-rule="evenodd"
	/>
	<path
		clip-rule="evenodd"
		d="M17.3702 13.6941C15.6442 13.6941 14.2402 15.0901 14.2402 16.8051C14.2402 18.5211 15.6442 19.9171 17.3702 19.9171C19.0962 19.9171 20.5002 18.5211 20.5002 16.8051C20.5002 15.0901 19.0962 13.6941 17.3702 13.6941Z"
		fill-rule="evenodd"
	/>
	<g opacity="0.4">
		<path
			clip-rule="evenodd"
			d="M11.4948 8.00342H19.6368V6.50342H11.4948V8.00342Z"
			fill-rule="evenodd"
		/>
		<path
			clip-rule="evenodd"
			d="M4.36279 17.6164H12.5048V16.1164H4.36279V17.6164Z"
			fill-rule="evenodd"
		/>
	</g>
</svg>
