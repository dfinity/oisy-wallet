<script>
	import { i18n } from '$lib/stores/i18n.store';
</script>

<!-- This is a draft SVG. Add correct image when design is finalized -->
<div class="flex flex-col items-center gap-4">
	<svg
		width="164"
		height="164"
		viewBox="0 0 164 164"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<circle cx="81.5" cy="81" r="81" fill="#0066FF" fill-opacity="0.1" />
		<g opacity="0.2">
			<path
				d="M82.1641 103.574C97.0758 103.574 109.164 91.4859 109.164 76.5742C109.164 61.6625 97.0758 49.5742 82.1641 49.5742C67.2524 49.5742 55.1641 61.6625 55.1641 76.5742C55.1641 91.4859 67.2524 103.574 82.1641 103.574Z"
				fill="#0066FF"
			/>
			<path
				opacity="0.4"
				d="M102.414 117.078H61.9141C43.2746 117.078 26.5785 134.29 38.8459 148.323C47.1882 157.866 60.9841 164.328 82.1638 164.328C103.344 164.328 117.14 157.866 125.483 148.323C137.75 134.29 121.054 117.078 102.414 117.078Z"
				fill="#0066FF"
			/>
		</g>
	</svg>

	<span class="m-0 text-xl font-bold">{$i18n.address_book.text.empty_title}</span>
	<span class="text-center">{$i18n.address_book.text.empty_text}</span>
</div>
