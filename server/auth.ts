import bcrypt from 'bcryptjs'
import express, { type NextFunction, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { UserModel } from './models/User.js'

const configuredJwtSecret = process.env.JWT_SECRET
if (!configuredJwtSecret || Buffer.byteLength(configuredJwtSecret) < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 bytes')
}
const jwtSecret: string = configuredJwtSecret

const router = express.Router()

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
    if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      response.status(401).json({ error: 'Invalid username or password' })
      return
    }

    response.json({ token: issueToken(user._id.toString()), user: { username: user.username } })
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