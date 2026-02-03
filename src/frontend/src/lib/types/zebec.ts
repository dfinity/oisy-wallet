export type AuthState = 'PENDING_PROFILE' | 'AUTHENTICATED';
export type AvailableService = 'zebecnet' | 'cards';

export interface ApiErrorPayload {
	message: string;
	code?: string;
	statusCode?: number;
	timestamp?: string;
}

export class ApiError extends Error {
	public readonly status: number;
	public readonly payload?: ApiErrorPayload;

	constructor(message: string, status: number, payload?: ApiErrorPayload) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.payload = payload;
	}
}

export interface HealthResponse {
	status: 'ok' | string;
}

export interface SendOtpRequest {
	email: string;
}
export interface SendOtpResponse {
	success: boolean;
	message: string;
	maskedEmail: string;
	expiresIn: number; // seconds
	purpose: string;
}

export interface VerifyOtpRequest {
	email: string;
	code: string; // 6-digit OTP, keep as string to preserve leading zeros
}

export interface VerifyOtpResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number; // seconds
	availableServices: AvailableService[];
	nextStep: 'complete_profile' | null;
	user: Record<string, unknown>;
	userId: string;
	isEmailVerified: boolean;
	isProfileComplete: boolean;
}

export interface RefreshRequest {
	refreshToken: string;
}
export interface RefreshResponse {
	accessToken: string;
	expiresIn: number; // seconds
	// Some implementations also rotate refreshToken; keep it optional if it appears later.
	refreshToken?: string;
}

export interface LogoutRequest {
	logoutAll?: boolean;
}
export interface LogoutResponse {
	success: boolean;
	message: string;
}

export type ChainName = 'solana' | string;
export type UserType = 'INDIVIDUAL' | 'BUSINESS' | string;
export type AuthType = 'wallet_only' | 'email_otp' | string;

export interface MeResponse {
	id: string;
	walletAddress: string;
	chainName: ChainName;
	isEmailVerified: boolean;
	userType: UserType;
	isProfileComplete: boolean;
	createdAt: string;
	lastLoginAt: string;
	walletId: string;
	sessionToken: string;
	authType: AuthType;
}

export interface StatusResponse {
	isValid: boolean;
	user: Record<string, unknown>;
	expiresAt: number; // epoch ms
}

export interface Session {
	id: string;
	isActive: boolean;
	createdAt: string;
	lastActiveAt: string;
	expiresAt: string;
	userAgent: string;
	ipAddress: string;
}

export interface ZebecClientOptions {
	baseUrl: string; // e.g. "https://api.example.com"
	/**
	 * Provide a custom fetch (Node <18, testing, etc.)
	 */
	fetchFn?: typeof fetch;
	/**
	 * Optional hook to retrieve/store tokens (e.g. localStorage, cookies, secure store)
	 */
	tokenStore?: TokenStore;
}

export interface TokenStore {
	getAccessToken(): string | null;
	getRefreshToken(): string | null;
	setAccessToken(token: string | null): void;
	setRefreshToken(token: string | null): void;
}

export class InMemoryTokenStore implements TokenStore {
	private accessToken: string | null = null;
	private refreshToken: string | null = null;

	getAccessToken(): string | null {
		return this.accessToken;
	}
	getRefreshToken(): string | null {
		return this.refreshToken;
	}
	setAccessToken(token: string | null): void {
		this.accessToken = token;
	}
	setRefreshToken(token: string | null): void {
		this.refreshToken = token;
	}
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions<TBody> {
	method: HttpMethod;
	path: string;
	body?: TBody;
	auth?: boolean;
	signal?: AbortSignal;
	headers?: Record<string, string>;
}
