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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions<TBody> {
	method: HttpMethod;
	path: string;
	body?: TBody;
	auth?: boolean;
	signal?: AbortSignal;
	headers?: Record<string, string>;
}

// --- Cards types ---

export interface CardsHealthResponse {
	status: 'healthy' | string;
	message: string;
}

export type CardProgramType = 'silver' | 'carbon' | string;

export interface CardProgram {
	type: CardProgramType;
	name: string;
	description: string;
	isRegional: boolean;
	isInternational: boolean;
	availableCurrencies: string[];
	region: string;
}

export interface UserRegion {
	name: string;
	value: string;
	currencies: string[];
	countries: string[];
}

export type CurrencyAmounts = Record<string, number>;

export interface CardsProgramsResponse {
	userRegion: UserRegion;
	availablePrograms: CardProgram[];
	currencies: CurrencyAmounts;
}

export interface MoneyAmount {
	amount: number;
	currencyCode: string;
}

export interface DepositReceipt {
	chainName: string;
	network: string;
	tokenName: string;
	tokenAmount: number;
	txHash: string;
	buyerAddress: string;
	packageCounter?: number;
	// present in /cards/sync example
	userEmail?: string;
	purchaseCounter?: number;
	paymentId?: string;
}

export interface CardReceipt {
	deposit: DepositReceipt;
}

export type CardOrderAction = 'create' | 'reload' | string;

export interface EncryptedPayload {
	/**
	 * Docs: { data: "iv:encryptedPayload" }
	 */
	data: string;
}

export interface CardOrderRequestPlain {
	action: CardOrderAction;
	amount: MoneyAmount;
	programId?: string; // required when action=create
	cardId?: string; // required when action=reload
	receipt?: {
		deposit: DepositReceipt;
	};
}

export type CardOrderStatus =
	| 'PENDING'
	| 'PROCESSING'
	| 'VALIDATED'
	| 'SUCCESS'
	| 'FAILED'
	| 'CANCELED'
	| string;

export interface CardOrderResponse {
	orderId: string;
	txHash: string;
	chainId: number;
	programId: string;
	cardType: CardProgramType;
	amount: MoneyAmount;
	status: CardOrderStatus;
	createdAt: string;
	date?: string;
	chainName?: string;
	signature?: string;
	payment?: Record<string, unknown>;
	recipientWebsiteLink?: string;
	partnerId?: string;
}

export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | string;

export interface CardOrderStatusResponse {
	orderId: string;
	transactionStatus: TransactionStatus;
	cardId?: string;
	cardStatus?: string;
	isValidated?: boolean;
	validationResult?: Record<string, unknown>;
	paymentId?: string;
	txHash?: string;
	programId?: string;
	cardType?: CardProgramType;
	amount?: MoneyAmount;
	createdAt?: string;
	updatedAt?: string;
	errorMessage?: string;
	retryCount?: number;
	message?: string;
	recipientWebsiteLink?: string;
}

export interface CardsSyncResponse extends CardOrderResponse {}

export interface CancelOrderResponse {
	message: string;
}

export interface PaginationMeta {
	page: number;
	take: number;
	itemCount: number;
	pageCount: number;
	hasPreviousPage: boolean;
	hasNextPage: boolean;
}

export interface ChainTransactionsResponse {
	data: CardOrderResponse[];
	meta: PaginationMeta;
}

export interface SilverCardSummary {
	id: string;
	cardType: 'silver' | string;
	cardStatus: string;
	totalLoaded: number;
	createdAt: string;
	recipientWebsiteLink: string;
	balance: string;
	cardNumber: string;
	onbeStatus: string;
}

export interface SilverCardsResponse {
	cards: SilverCardSummary[];
	totalCount: number;
}

export interface CarbonCardResponse extends SilverCardSummary {
	// docs say carbon can be null if not found
}

export interface CardDetailsResponse {
	id: string;
	cardNumber: string;
	expirationDate: string;
	cvv: string;
	availableBalance: string;
	cardType: CardProgramType;
	cardStatus: string;
	recipientWebsiteLink: string;
}

export interface CardProfileResponse {
	recipient: {
		participantId: string;
		personId: string;
		firstName: string;
		lastName: string;
		address: {
			address1: string;
			address2?: string;
			city: string;
			state?: string;
			postalCode: string;
			countryCode: string;
		};
		emailAddress: string;
		mobilePhone?: string;
	};
}

export interface UpdateCardProfileRequest {
	firstName: string;
	lastName: string;
	address1: string;
	address2?: string;
	city: string;
	state?: string;
	postalCode: string;
	countryCode: string;
	email: string;
	mobilePhone?: string;
}

export interface PinResponse {
	pin: string;
}

export interface ChangePinRequest {
	newPIN: string;
}

export interface CardStatusResponse {
	status: string;
	statusDescription?: string;
}

export interface UpdateCardStatusResponse {
	success: boolean;
}

export type SortOrder = 'ASC' | 'DESC';

export interface CardTransactionsQuery {
	page?: number;
	take?: number;
	status?: string;
	cardType?: string;
	chain?: string;
	startDate?: string;
	endDate?: string;
	order?: SortOrder;
	term?: 'allTime' | 'currentMonth' | 'lastSixMonths' | 'lastYear' | string;
}

export interface CardTransactionsResponse<TItem = string> {
	data: TItem[];
}

export interface ReloadHistoryQuery {
	order?: SortOrder;
	page?: number;
	take?: number;
	q?: string;
	startDate?: string; // date-time string
	endDate?: string; // date-time string
	term?: string;
	status?: string;
	cardId?: string;
	userId?: string;
	chainName?: string;
	transactionStatus?: string;
}

// Not specified in docs, so keep minimal / flexible
export interface ReloadHistoryResponse {
	data?: unknown;
}
