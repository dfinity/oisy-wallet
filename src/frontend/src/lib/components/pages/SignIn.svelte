<script lang="ts">
	import SignInSection from '$lib/components/core/SignInSection.svelte';
	import SignInBackground from '$lib/components/core/SignInBackground.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import HeaderSignIn from '$lib/components/layout/HeaderSignIn.svelte';
</script>

<main>
	<HeaderSignIn />

	<SignInSection />

	<SignInBackground />

	<Footer />
</main>
