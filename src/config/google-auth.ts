import { Auth, google } from 'googleapis'
import { TOKEN_EXPIRY_BUFFER_MS } from './constants.js'

interface TokenCache {
  accessToken: string
  expiryDate: number
}

class GoogleAuthClient {
  private oauth2Client: Auth.OAuth2Client
  private tokenCache: TokenCache | null = null

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
    if (refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      })
    }
  }

  getClient(): Auth.OAuth2Client {
    return this.oauth2Client
  }

  async ensureValidToken(): Promise<void> {
    const now = Date.now()

    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expiryDate > now + TOKEN_EXPIRY_BUFFER_MS) {
      return
    }

    // Need to refresh the token
    const { token, res } = await this.oauth2Client.getAccessToken()

    if (token && res?.data) {
      const credentials = res.data as { expiry_date?: number }
      this.tokenCache = {
        accessToken: token,
        expiryDate: credentials.expiry_date || now + 3600 * 1000
      }
    }
  }
}

// Singleton instance
let authClientInstance: GoogleAuthClient | null = null

export function getAuthClient(): GoogleAuthClient {
  if (!authClientInstance) {
    authClientInstance = new GoogleAuthClient()
  }
  return authClientInstance
}

