import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'
import { connectDatabase } from './db.js'
import { ObservationModel, SiteModel } from './models/index.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(express.json())

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})

app.get('/api/sites', async (_request, response, next) => {
  try {
    const sites = await SiteModel.find({ status: 'active' }).sort({ name: 1 }).lean()
    response.json(sites)
  } catch (error) {
    next(error)
  }
})

app.get('/api/sites/:siteId', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.siteId)) {
      response.status(400).json({ error: 'siteId must be a valid MongoDB ObjectId' })
      return
    }

    const site = await SiteModel.findOne({ _id: request.params.siteId, status: 'active' }).lean()
    if (!site) {
      response.status(404).json({ error: 'Active site not found' })
      return
    }

    response.json(site)
  } catch (error) {
    next(error)
  }
})

app.post('/api/sites', async (request, response, next) => {
  try {
    const site = await SiteModel.create(request.body)
    response.status(201).json(site)
  } catch (error) {
    next(error)
  }
})

app.get('/api/sites/:siteId/observations', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.siteId)) {
      response.status(400).json({ error: 'siteId must be a valid MongoDB ObjectId' })
      return
    }

    const observations = await ObservationModel.find({ siteId: request.params.siteId })
      .sort({ observedAt: -1 })
      .lean()
    response.json(observations)
  } catch (error) {
    next(error)
  }
})

app.post('/api/sites/:siteId/observations', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.siteId)) {
      response.status(400).json({ error: 'siteId must be a valid MongoDB ObjectId' })
      return
    }

    const siteExists = await SiteModel.exists({ _id: request.params.siteId, status: 'active' })
    if (!siteExists) {
      response.status(404).json({ error: 'Active site not found' })
      return
    }

    const observation = await ObservationModel.create({
      ...request.body,
      siteId: request.params.siteId,
    })
    response.status(201).json(observation)
  } catch (error) {
    next(error)
  }
})

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({ error: error.message })
    return
  }

  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
})

await connectDatabase()
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})