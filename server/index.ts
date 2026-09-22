import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'
import { connectDatabase } from './db.js'
import { ObservationModel, PlotModel, SiteModel } from './models/index.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(express.json())

function getObjectBody(body: unknown): Record<string, unknown> | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }

  return body as Record<string, unknown>
}

function getField<T>(body: Record<string, unknown>, field: string): T | undefined {
  return body[field] as T | undefined
}

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

    const [plots, observations] = await Promise.all([
      PlotModel.find({ siteId: site._id }).sort({ name: 1 }).lean(),
      ObservationModel.find({ siteId: site._id })
        .populate('plotId', 'name plantedTrees survivingTrees')
        .sort({ observedAt: -1 })
        .lean(),
    ])

    response.json({ site, plots, observations })
  } catch (error) {
    next(error)
  }
})

app.post('/api/sites', async (request, response, next) => {
  try {
    const body = getObjectBody(request.body)
    if (!body) {
      response.status(400).json({ error: 'Request body must be a JSON object' })
      return
    }

    const site = await SiteModel.create({
      name: getField<string>(body, 'name'),
      region: getField<string>(body, 'region'),
      plantedTrees: getField<number>(body, 'plantedTrees'),
      targetSurvivalRate: getField<number>(body, 'targetSurvivalRate'),
      status: getField<'active' | 'archived'>(body, 'status'),
    })
    response.status(201).json(site)
  } catch (error) {
    next(error)
  }
})

app.put('/api/sites/:siteId', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.siteId)) {
      response.status(400).json({ error: 'siteId must be a valid MongoDB ObjectId' })
      return
    }

    const body = getObjectBody(request.body)
    if (!body) {
      response.status(400).json({ error: 'Request body must be a JSON object' })
      return
    }

    const site = await SiteModel.findOneAndUpdate(
      { _id: request.params.siteId, status: 'active' },
      {
        name: getField<string>(body, 'name'),
        region: getField<string>(body, 'region'),
        plantedTrees: getField<number>(body, 'plantedTrees'),
        targetSurvivalRate: getField<number>(body, 'targetSurvivalRate'),
        status: getField<'active' | 'archived'>(body, 'status'),
      },
      { new: true, runValidators: true },
    ).lean()

    if (!site) {
      response.status(404).json({ error: 'Active site not found' })
      return
    }

    response.json(site)
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

    const body = getObjectBody(request.body)
    if (!body) {
      response.status(400).json({ error: 'Request body must be a JSON object' })
      return
    }

    const siteExists = await SiteModel.exists({ _id: request.params.siteId, status: 'active' })
    if (!siteExists) {
      response.status(404).json({ error: 'Active site not found' })
      return
    }

    const plotId = getField<mongoose.Types.ObjectId | string>(body, 'plotId')
    if (plotId !== undefined) {
      if (!mongoose.isValidObjectId(plotId)) {
        response.status(400).json({ error: 'plotId must be a valid MongoDB ObjectId' })
        return
      }

      const plotExists = await PlotModel.exists({ _id: plotId, siteId: request.params.siteId })
      if (!plotExists) {
        response.status(404).json({ error: 'Plot not found for this site' })
        return
      }
    }

    const observation = await ObservationModel.create({
      plotId,
      observedAt: getField<Date | string>(body, 'observedAt'),
      observedBy: getField<string>(body, 'observedBy'),
      survivingTrees: getField<number>(body, 'survivingTrees'),
      notes: getField<string>(body, 'notes'),
      source: getField<'manual' | 'csv'>(body, 'source'),
      siteId: request.params.siteId,
    })
    response.status(201).json(observation)
  } catch (error) {
    next(error)
  }
})

app.put('/api/sites/:siteId/observations/:observationId', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.siteId) || !mongoose.isValidObjectId(request.params.observationId)) {
      response.status(400).json({ error: 'siteId and observationId must be valid MongoDB ObjectIds' })
      return
    }

    const body = getObjectBody(request.body)
    if (!body) {
      response.status(400).json({ error: 'Request body must be a JSON object' })
      return
    }

    const plotId = getField<mongoose.Types.ObjectId | string>(body, 'plotId')
    if (plotId !== undefined) {
      if (!mongoose.isValidObjectId(plotId)) {
        response.status(400).json({ error: 'plotId must be a valid MongoDB ObjectId' })
        return
      }

      const plotExists = await PlotModel.exists({ _id: plotId, siteId: request.params.siteId })
      if (!plotExists) {
        response.status(404).json({ error: 'Plot not found for this site' })
        return
      }
    }

    const observation = await ObservationModel.findOneAndUpdate(
      { _id: request.params.observationId, siteId: request.params.siteId },
      {
        plotId,
        observedAt: getField<Date | string>(body, 'observedAt'),
        observedBy: getField<string>(body, 'observedBy'),
        survivingTrees: getField<number>(body, 'survivingTrees'),
        notes: getField<string>(body, 'notes'),
        source: getField<'manual' | 'csv'>(body, 'source'),
      },
      { new: true, runValidators: true },
    ).lean()

    if (!observation) {
      response.status(404).json({ error: 'Observation not found for this site' })
      return
    }

    response.json(observation)
  } catch (error) {
    next(error)
  }
})

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({ error: error.message })
    return
  }

  if (error instanceof mongoose.Error && 'code' in error && error.code === 11000) {
    response.status(409).json({ error: 'A record with the same unique fields already exists' })
    return
  }

  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
})

await connectDatabase()
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})