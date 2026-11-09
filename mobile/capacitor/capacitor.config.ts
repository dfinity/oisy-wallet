import type { CapacitorConfig } from '@capacitor/cli';
import environment from './app-environment.json';

const config: CapacitorConfig = {
	appId: environment.simulatorBundleID,
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
