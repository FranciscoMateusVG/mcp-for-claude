#!/usr/bin/env node

const { google } = require('googleapis')
const readline = require('readline')

const CLIENT_ID = 'YOUR_CLIENT_ID'
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET'
const REDIRECT_URI = 'YOUR_REDIRECT_URI'

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
)

// Add the scopes that you need
const SCOPES = ['https://www.googleapis.com/auth/calendar']

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Forces to get refresh token
})

console.log('='.repeat(80))
console.log('📅 Google Calendar OAuth2 Token Generator')
console.log('='.repeat(80))
console.log('\n🔗 Authorize this app by visiting this url:\n')
console.log('\x1b[36m%s\x1b[0m', authUrl)
console.log('\n📋 Instructions:')
console.log('1. Click the URL above (or copy and paste it into your browser)')
console.log('2. Sign in with your Google account')
console.log('3. Grant the requested permissions')
console.log('4. After authorization, you will be redirected to your domain')
console.log('5. Copy the FULL URL from your browser address bar')
console.log('6. Paste it below\n')
console.log('='.repeat(80))

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question('\n🔑 Enter the full redirect URL: ', (url) => {
  rl.close()

  try {
    const urlObj = new URL(url)
    const code = urlObj.searchParams.get('code')

    if (!code) {
      console.error('\n❌ Error: No authorization code found in URL')
      console.error('Make sure you copied the complete URL from your browser')
      process.exit(1)
    }

    console.log('\n⏳ Exchanging authorization code for tokens...\n')

    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error('❌ Error retrieving access token:', err.message)
        process.exit(1)
      }

      console.log('='.repeat(80))
      console.log('✅ SUCCESS! Tokens retrieved')
      console.log('='.repeat(80))
      console.log('\n📝 Your tokens:\n')
      console.log('Refresh Token:')
      console.log('\x1b[32m%s\x1b[0m', token.refresh_token)
      console.log('\nAccess Token (temporary):')
      console.log('\x1b[33m%s\x1b[0m', token.access_token)
      console.log(
        '\nExpires in:',
        token.expiry_date ? new Date(token.expiry_date).toLocaleString() : 'N/A'
      )
      console.log('\n' + '='.repeat(80))
      console.log('📋 Next Steps:')
      console.log('='.repeat(80))
      console.log(
        "\n1. Create a .env file in your project root (if it doesn't exist)"
      )
      console.log(`GOOGLE_REFRESH_TOKEN=${token.refresh_token}`)
      console.log(
        '\n⚠️  IMPORTANT: Keep your refresh token secret and never commit it to version control!\n'
      )
    })
  } catch (error) {
    console.error('\n❌ Error: Invalid URL format')
    console.error('Make sure you pasted the complete URL from your browser')
    console.error('Error details:', error.message)
    process.exit(1)
  }
})
