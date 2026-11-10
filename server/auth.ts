import bcrypt from 'bcryptjs'
import express, { type NextFunction, type Request, type Response } from 'express'
import { OAuth2Client, type TokenPayload } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { UserModel } from './models/User.js'

const configuredJwtSecret = process.env.JWT_SECRET
if (!configuredJwtSecret || Buffer.byteLength(configuredJwtSecret) < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 bytes')
}
const jwtSecret: string = configuredJwtSecret
const googleOAuthClient = new OAuth2Client()

const router = express.Router()

function getGoogleCredential(body: unknown): string | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null

  const credential = (body as Record<string, unknown>).credential
  return typeof credential === 'string' && credential.length > 0 && credential.length <= 8192
    ? credential
    : null
}

function createGoogleUsername(email: string, googleId: string): string {
  const localPart = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'google'
  return `${localPart.slice(0, 15)}_${googleId.slice(-8).toLowerCase()}`
}

function getCredentials(body: unknown): { username: string; password: string } | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null

  const candidate = body as Record<string, unknown>
  if (typeof candidate.username !== 'string' || typeof candidate.password !== 'string') return null

  const username = candidate.username.trim().toLowerCase()
  const password = candidate.password
  if (!/^[a-z0-9_]{3,24}$/.test(username) || Buffer.byteLength(password, 'utf8') > 72) return null

  return { username, password }
}

function issueToken(userId: string): string {
  return jwt.sign({}, jwtSecret, { subject: userId, expiresIn: '7d' })
}

export function authenticateToken(request: Request, response: Response, next: NextFunction) {
  const authorization = request.header('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    response.status(401).json({ error: 'Authentication required' })
    return
  }

  try {
    const payload = jwt.verify(token, jwtSecret)
    if (typeof payload === 'string' || !payload.sub) {
      response.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    response.locals.authUserId = payload.sub
    next()
  } catch {
    response.status(401).json({ error: 'Invalid or expired token' })
  }
}

router.post('/register', async (request, response, next) => {
  const credentials = getCredentials(request.body)
  if (!credentials || credentials.password.length < 8) {
    response.status(400).json({ error: 'Use a 3-24 character username and a password of at least 8 characters' })
    return
  }

  try {
    const passwordHash = await bcrypt.hash(credentials.password, 12)
    const user = await UserModel.create({ username: credentials.username, passwordHash })
    response.status(201).json({ token: issueToken(user._id.toString()), user: { username: user.username } })
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (request, response, next) => {
  const credentials = getCredentials(request.body)
  if (!credentials || credentials.password.length < 1) {
    response.status(400).json({ error: 'Username and password are required' })
    return
  }

  try {
    const user = await UserModel.findOne({ username: credentials.username }).select('+passwordHash')
    if (!user?.passwordHash || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      response.status(401).json({ error: 'Invalid username or password' })
      return
    }

    response.json({ token: issueToken(user._id.toString()), user: { username: user.username } })
  } catch (error) {
    next(error)
  }
})

router.post('/google', async (request, response, next) => {
  const credential = getGoogleCredential(request.body)
  if (!credential) {
    response.status(400).json({ error: 'A Google credential is required' })
    return
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID
  if (!googleClientId) {
    response.status(503).json({ error: 'Google sign-in is not configured on the server' })
    return
  }

  let profile: TokenPayload | undefined
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    })
    profile = ticket.getPayload()
  } catch {
    response.status(401).json({ error: 'Google credential is invalid or expired' })
    return
  }

  if (!profile?.sub || !profile.email || profile.email_verified !== true) {
    response.status(401).json({ error: 'Google account email could not be verified' })
    return
  }

  try {
    let user = await UserModel.findOne({ googleId: profile.sub })
    if (!user) {
      const email = profile.email.toLowerCase()
      user = await UserModel.findOne({ email })
      if (user) {
        if (user.googleId && user.googleId !== profile.sub) {
          response.status(409).json({ error: 'This email is linked to a different Google account' })
          return
        }

        user.googleId = profile.sub
        user.displayName = profile.name
        user.avatarUrl = profile.picture
        await user.save()
      } else {
        user = await UserModel.create({
          username: createGoogleUsername(email, profile.sub),
          email,
          googleId: profile.sub,
          displayName: profile.name,
          avatarUrl: profile.picture,
        })
      }
    }

    response.json({
      token: issueToken(user._id.toString()),
      user: { username: user.username },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/me', authenticateToken, async (_request, response, next) => {
  try {
    const user = await UserModel.findById(response.locals.authUserId).select('username').lean()
    if (!user) {
      response.status(401).json({ error: 'Account no longer exists' })
      return
    }

    response.json({ user: { username: user.username } })
  } catch (error) {
    next(error)
  }
})

export const authRouter = router
router.post('/autocomplete', authenticateToken, async (request, response, next) => {
  const body = request.body
  const context = body !== null && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).context : undefined
  if (typeof context !== 'string' || context.trim().length < 10 || context.length > 600) {
    response.status(400).json({ error: 'Describe the field observation in 10 to 600 characters' })
    return
  }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    response.status(503).json({ error: 'AI autocomplete is not configured. Set GEMINI_API_KEY on the server.' })
    return
  }
  try {
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `Draft a concise field observation note for tree plantation monitoring using only these details. Do not invent measurements, causes, names, or actions. Return only a neutral professional note under 100 words. Details: ${context.trim()}` }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 180 } }),
      signal: AbortSignal.timeout(15000),
    })
    if (!aiResponse.ok) {
      response.status(502).json({ error: 'The AI provider could not generate a suggestion. Try again later.' })
      return
    }

    const result = await aiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const suggestion = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
    if (!suggestion) {
      response.status(502).json({ error: 'The AI provider returned an empty suggestion. Try again.' })
      return
    }

    response.json({ suggestion })
  } catch (error) {
    next(error)
  }
})
