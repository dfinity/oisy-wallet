import type { CapacitorConfig } from '@capacitor/cli';

// POC configuration. The web assets are the standard SvelteKit static build
// (`npm run build` at the repo root), shared 1:1 with the web wallet.
const config: CapacitorConfig = {
	appId: 'com.oisy.wallet',
	appName: 'OISY Wallet',
	webDir: '../build',
	android: {
		// The wallet talks to IC boundary nodes over HTTPS only; cleartext stays off.
		allowMixedContent: false,
		// Android 15 (target SDK 35) enforces edge-to-edge, laying the WebView
		// out under the status and gesture bars — and Android's WebView reports
		// `env(safe-area-inset-*)` as 0, so the web app cannot compensate in
		// CSS. Let Capacitor add the margins so the viewport stops at the system
		// bars. ('auto' is a no-op on devices that don't enforce edge-to-edge,
		// and becomes the default in Capacitor 8.)
		adjustMarginsForEdgeToEdge: 'auto'
	},
	server: {
		// Serve the WebView from an https origin so web crypto and IndexedDB
		// behave like on the web. NOTE: this origin plays no role in identity
		// derivation — login happens in the system browser on the canonical
		// web origin (see docs/ai/spec-driven-development/specs/2026-07-10-feat-mobile-app-poc.md).
		androidScheme: 'https',
		iosScheme: 'https'
	}
};

export default config;
