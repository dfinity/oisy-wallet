import { AUTH_MAX_TIME_TO_LIVE } from '$lib/constants/app.constants';

// Build target, not a trust signal. Native independently validates every bridge call.
export const MOBILE_SHELL = import.meta.env.VITE_MOBILE_SHELL === 'true';

// Use the web sign-in lifetime; AuthSession.duration must match in the native host.
// Grants keep the original sign-in deadline.
export const MOBILE_SESSION_DURATION_MS = Number(AUTH_MAX_TIME_TO_LIVE) / 1_000_000;
