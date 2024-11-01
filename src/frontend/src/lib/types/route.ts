export type Route = 'transactions' | 'tokens' | 'settings' | 'explore';

export type HeroRoute = Extract<Route, 'transactions' | 'tokens'>;
