<svg fill="none" height="180" viewBox="0 0 110 110" width="180" xmlns="http://www.w3.org/2000/svg">
	<path
		clip-rule="evenodd"
		d="m62.996 72.605-.022 4.347a.75.75 0 0 1-.697.746 115.33 115.33 0 0 1-4.887.22.75.75 0 0 1-.769-.756l.02-4.009c-.567.014-1.14.02-1.718.018a64.54 64.54 0 0 1-1.553-.03l-.02 4.008a.75.75 0 0 1-.776.747 117.24 117.24 0 0 1-4.884-.264.75.75 0 0 1-.69-.752l.021-4.327c-9.19-1.522-15.792-6.1-15.698-16.428l.013-2.528c.012-10.348 6.66-14.846 15.866-16.269l.022-4.324a.75.75 0 0 1 .699-.746c1.596-.105 3.228-.174 4.885-.213a.75.75 0 0 1 .768.755l-.02 4.008c.513-.011 1.031-.016 1.553-.014.578.003 1.151.014 1.719.032l.02-4.006a.75.75 0 0 1 .776-.747c1.657.058 3.288.145 4.884.27a.75.75 0 0 1 .69.752l-.022 4.336c9.081 1.546 15.559 6.147 15.507 16.408l-.014 2.529c-.011 10.26-6.572 14.778-15.673 16.237z"
		fill="#06F"
		fill-rule="evenodd"
	/>
	<g class="inner-area">
		<path
			class="helmet-glass"
			clip-rule="evenodd"
			d="m72.133 55.626-.004-1.422c.105-9.443-7.822-11.147-17.137-11.25-9.358.154-17.276 1.9-17.12 11.342l.004 1.422c-.105 9.486 7.822 11.19 17.18 11.294 9.315-.154 17.233-1.9 17.077-11.386z"
			fill="#fff"
			fill-rule="evenodd"
		/>
		<rect class="eye-left" fill="#06F" height="9.125" rx="1.25" width="5" x="44.375" y="50.438" />
		<rect class="eye-right" fill="#06F" height="9.063" rx="1.25" width="5" x="60.625" y="50.438" />
	</g>
</svg>

<style lang="scss">
	@keyframes moveInnerArea {
		0% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-5px);
		}
		40% {
			transform: translateX(-5px);
		}
		60% {
			transform: translateX(5px);
		}
		80% {
			transform: translateX(5px);
		}
		100% {
			transform: translateX(0);
		}
	}

	@keyframes moveEyes {
		0% {
			transform: translateX(0) scaleY(1);
		}
		20% {
			transform: translateX(-5px) scaleY(0.65);
		}
		40% {
			transform: translateX(-5px) scaleY(0.65);
		}
		60% {
			transform: translateX(5px) scaleY(0.65);
		}
		80% {
			transform: translateX(5px) scaleY(0.65);
		}
		100% {
			transform: translateX(0) scaleY(1);
		}
	}

	.eye-left,
	.eye-right {
		transform-origin: 50% 50%;
		animation: moveEyes 3s cubic-bezier(0.76, 0, 0.24, 1) infinite;
	}

	.inner-area {
		animation: moveInnerArea 3s cubic-bezier(0.76, 0, 0.24, 1) infinite;
		animation-iteration-count: infinite;
	}
</style>
