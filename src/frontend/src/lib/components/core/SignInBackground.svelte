<div class="z-0 bg-misty-rose opacity-5 top-right rounded-50" />

<div class="z-0 bg-misty-rose opacity-5 bottom-left rounded-50" />

<style lang="scss">
	@use '../../../../../../node_modules/@dfinity/gix-components/dist/styles/mixins/media';

	div {
		position: fixed;

		--circle-size: calc(634px / 2);

		@include media.min-width(medium) {
			--circle-size: calc(634px / 1.5);
		}

		@include media.min-width(large) {
			--circle-size: 634px;
		}

		width: var(--circle-size);
		height: var(--circle-size);
	}

	.top-right {
		top: calc((var(--circle-size) / 2) * -1);
		right: calc((var(--circle-size) / 2) * -1);
	}

	.bottom-left {
		bottom: calc((var(--circle-size) / 3) * -1);
		left: calc((var(--circle-size) / 3) * -1);
	}
</style>
