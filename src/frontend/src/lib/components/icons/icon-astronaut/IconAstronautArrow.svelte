<!-- source: DFINITY foundation -->
<svg class="button__icon" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
	<defs>
		<symbol id="svg-arrow" class="svg-arrow-go" fill="none" viewBox="0 0 13 10">
			<path
				d="M1 5H11"
				stroke="white"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
			/>

			<line
				stroke="white"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
				x1="7"
				x2="11"
				y1="1"
				y2="5"
			/>
			<line
				stroke="white"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1.5"
				x1="7"
				x2="11"
				y1="9"
				y2="5"
			/>
		</symbol>
		<symbol id="svg-vizor" class="svg-vizor" fill="none" viewBox="0 0 20 10">
			<path
				d="M0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10C20 6.68629 17.3137 4 14 4H6C2.68629 4 0 6.68629 0 10Z"
				fill="white"
			/>
		</symbol>
		<symbol id="svg-infinity" class="svg-infinity" fill="none" viewBox="0 0 16 8"> </symbol>
	</defs>
	<circle cx="12" cy="12" r="11" stroke="white" stroke-width="2" />
	<g class="svg-arrow-go" transform="translate(6 6.5)">
		<path
			d="M11 5H1"
			stroke="white"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.5"
		/>

		<line
			stroke="white"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.5"
			x1="11"
			x2="7"
			y1="5"
			y2="1"
		/>
		<line
			stroke="white"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.5"
			x1="11"
			x2="7"
			y1="5"
			y2="9"
		/>
	</g>
	<use class="svg-vizor" href="#svg-vizor" x="0" y="-4" />
	<g class="svg-infinity" transform="translate(4.1 9)">
		<path
			d="M8 4C6.6 1.9975 5.2 1 3.8 1C3.05739 1 2.3452 1.31607 1.8201 1.87868C1.295 2.44129 1 3.20435 1 4C1 4.79565 1.295 5.55871 1.8201 6.12132C2.3452 6.68393 3.25739 7 4 7C5.4 7 6.6 6.0025 8 4ZM8 4C9.4 6.0025 10.6 7 12 7C12.7426 7 13.6548 6.68393 14.1799 6.12132C14.705 5.55871 15 4.79565 15 4C15 3.20435 14.705 2.44129 14.1799 1.87868C13.6548 1.31607 12.9426 1 12.2 1C10.8 1 9.4 1.9975 8 4Z"
			stroke="white"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="1.25"
		/>
	</g>
</svg>

<style lang="scss">
	.button__icon {
		width: 1.4em;
		height: 1.4em;
		overflow: hidden;
		border-radius: 2rem;
	}

	.svg-arrow-go path,
	.svg-arrow-go line {
		stroke-dasharray: 20;
		stroke-dashoffset: 0;
		transition: stroke-dashoffset 0.5s ease-in-out;
		transition-delay: 0.2s;
	}

	.svg-arrow-go line {
		transition-delay: 0s;
		transition-duration: 0.2s;
	}

	.svg-infinity path {
		stroke-dasharray: 20;
		stroke-dashoffset: 20;
		transition: stroke-dashoffset 0.4s cubic-bezier(0.3, 0.7, 0, 1);
	}

	.svg-arrow-go line {
		transition-delay: 0.6s;
	}

	.svg-vizor path {
		transform: translateY(-5px);
		transition: transform 0.5s cubic-bezier(0.3, 0.7, 0, 1);
		transition-delay: 0.2s;
	}
</style>
