import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'org.dfinity.oisy.capacitor.preview',
	appName: 'OISY Preview',
	webDir: '../../build-mobile',
	loggingBehavior: 'none',
	// The iOS 26 deployment target requires PackageDescription 6.2.
	experimental: { ios: { spm: { swiftToolsVersion: '6.2' } } },
	ios: { contentInset: 'never', scrollEnabled: true },
	server: { hostname: 'localhost', iosScheme: 'capacitor', androidScheme: 'https' },
	plugins: { CapacitorCookies: { enabled: false }, CapacitorHttp: { enabled: false } }
};
export default config;
