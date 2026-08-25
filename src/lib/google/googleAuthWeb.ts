export const GOOGLE_CLIENT_ID_WEB = import.meta.env.VITE_GOOGLE_CLIENT_ID_WEB

export const isGoogleWebConfigured = (): boolean => Boolean(GOOGLE_CLIENT_ID_WEB)
