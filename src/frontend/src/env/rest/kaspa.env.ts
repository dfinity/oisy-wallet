import { LOCAL } from '$lib/constants/app.constants';

// Kaspa public REST API endpoints
// Documentation: https://api.kaspa.org/docs
//
// In local development, we use Vite proxy to bypass CORS.
// The proxy paths are defined in vite.config.ts

export const KASPA_API_URL_MAINNET = LOCAL ? '/kaspa-api' : 'https://api.kaspa.org';

export const KASPA_API_URL_TESTNET = LOCAL ? '/kaspa-testnet-api' : 'https://api-tn10.kaspa.org';
