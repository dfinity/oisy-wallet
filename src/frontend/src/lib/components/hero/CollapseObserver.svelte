<script lang="ts">
	import { authNotSignedIn } from '$lib/derived/auth.derived';

	export let collapse: boolean;

	let observer: IntersectionObserver;

	const heroRef = (node: HTMLElement) => {
		if (observer) {
			observer.disconnect();
		}

		observer = new IntersectionObserver(
			(entries) => {
				if ($authNotSignedIn) {
					collapse = false;
					return;
				}

				entries.forEach((entry) => (collapse = !entry.isIntersecting));
			},
			{ threshold: 0 }
		);

		observer.observe(node);
	};
</script>

<div use:heroRef></div>
