// Réponses API paginées
export interface ApiList<T> {
  data: T[]
  meta?: {
    total: number
    page: number
    size: number
  }
}

export interface ApiItem<T> {
  data: T
}

// Tokens OAuth2
export interface OAuthToken {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}
