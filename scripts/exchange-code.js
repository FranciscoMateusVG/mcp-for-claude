#!/usr/bin/env node

const { google } = require('googleapis')

const CLIENT_ID = 'YOUR_CLIENT_ID'
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET'
const REDIRECT_URI = 'YOUR_REDIRECT_URI'

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
)

// ⚠️ REPLACE THIS with your authorization code
const code = 'REPLACE THIS WITH YOUR CODE'

console.log('='.repeat(80))
console.log('🔄 Exchanging authorization code for tokens...')
console.log('='.repeat(80))
console.log()

if (!code || code.includes('PASTE_YOUR_CODE_HERE')) {
  console.error('❌ Error: No authorization code provided')
  console.error(
    '\n📝 Instructions:\n' +
      '1. First, get an authorization code by visiting:\n' +
      '   https://accounts.google.com/o/oauth2/v2/auth?...\n' +
      '2. Copy the code from the redirect URL\n' +
      "3. Replace the 'code' variable in this script with your code\n" +
      '4. Run this script again: node scripts/exchange-code.js\n'
  )
  process.exit(1)
}

oauth2Client.getToken(code, (err, token) => {
  if (err) {
    console.error('❌ Error retrieving access token:', err.message)
    console.error('\n💡 Common issues:')
    console.error('   - The code may have expired (codes are single-use)')
    console.error('   - The code may have already been used')
    console.error('   - The redirect URI might not match')
    console.error('\n🔄 Try getting a new authorization code and run again\n')
    return
  }

  console.log('='.repeat(80))
  console.log('✅ SUCCESS! Tokens retrieved')
  console.log('='.repeat(80))
  console.log('\n📝 Your tokens:\n')

  if (token.access_token) {
    console.log('🔓 Access Token (temporary):')
    console.log('\x1b[33m%s\x1b[0m', token.access_token)
    console.log()
  }

  if (token.refresh_token) {
    console.log('🔑 REFRESH TOKEN (save this):')
    console.log('\x1b[32m%s\x1b[0m', token.refresh_token)
    console.log()
  } else {
    console.warn(
      '⚠️  Warning: No refresh token received. This usually means:\n' +
        '   - You need to add prompt=consent to the authorization URL\n' +
        '   - Or revoke access and re-authorize\n'
    )
  }

  if (token.expiry_date) {
    console.log('⏰ Expires:', new Date(token.expiry_date).toLocaleString())
    console.log()
  }

  console.log('='.repeat(80))
  console.log('📋 Next Steps:')
  console.log('='.repeat(80))
  console.log(
    "\n1. Create a .env file in your project root (if it doesn't exist)"
  )

  if (token.refresh_token) {
    console.log(`GOOGLE_REFRESH_TOKEN=${token.refresh_token}`)
  } else {
    console.log('GOOGLE_REFRESH_TOKEN=<your_refresh_token_here>')
  }

  console.log(
    '\n⚠️  IMPORTANT: Keep your refresh token secret and never commit it to version control!\n'
  )
})
