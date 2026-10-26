import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import mongoose from 'mongoose'
import { parse } from 'csv-parse/sync'
import multer from 'multer'
import { authenticateToken, authRouter } from './auth.js'
import { connectDatabase } from './db.js'
import { ObservationModel, PlotModel, SiteModel } from './models/index.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)
const maxUploadBytes = 2 * 1024 * 1024
const maxCsvRows = 500
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes, files: 1, fields: 0 },
  fileFilter: (_request, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      callback(new Error('Upload a .csv file'))
      return
    }
    callback(null, true)
  },
})

class CsvUploadError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message)
    this.name = 'CsvUploadError'
  }
}

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

app.use('/api/auth', authRouter)
app.use('/api', authenticateToken)

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

app.post('/api/sites/:siteId/observations/upload', (request, response, next) => {
  if (!mongoose.isValidObjectId(request.params.siteId)) {
    response.status(400).json({ error: 'siteId must be a valid MongoDB ObjectId' })
    return
  }

  csvUpload.single('file')(request, response, (uploadError: unknown) => {
    if (uploadError) {
      if (uploadError instanceof multer.MulterError) {
        const status = uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400
        response.status(status).json({
          error: uploadError.code === 'LIMIT_FILE_SIZE'
            ? 'CSV files must be 2 MB or smaller'
            : 'Upload exactly one CSV file using the file field',
        })
        return
      }

      if (uploadError instanceof Error) {
        response.status(400).json({ error: uploadError.message })
        return
      }

      next(uploadError)
      return
    }

    void importObservationCsv(request)
      .then((imported) => response.status(201).json({ imported }))
      .catch((error: unknown) => {
        if (error instanceof CsvUploadError) {
          response.status(error.statusCode).json({ error: error.message })
          return
        }
        next(error)
      })
  })
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

async function importObservationCsv(request: Request): Promise<number> {
  const file = request.file
  if (!file) {
    throw new CsvUploadError('Select a CSV file to upload')
  }

  const siteId = request.params.siteId
  const site = await SiteModel.findOne({ _id: siteId, status: 'active' }).select('_id').lean()
  if (!site) {
    throw new CsvUploadError('Active site not found', 404)
  }

  let records: Record<string, string>[]
  try {
    records = parse(file.buffer, {
      bom: true,
      columns: (headers: string[]) => {
        const normalizedHeaders = headers.map((header) => header.trim())
        if (normalizedHeaders.some((header) => !header) || new Set(normalizedHeaders).size !== normalizedHeaders.length) {
          throw new Error('CSV headers must be non-empty and unique')
        }
        return normalizedHeaders
      },
      skip_empty_lines: true,
      trim: true,
      max_record_size: 16 * 1024,
    }) as Record<string, string>[]
  } catch {
    throw new CsvUploadError('CSV format is invalid. Check its quoting and column layout.')
  }

  if (records.length === 0) {
    throw new CsvUploadError('The CSV has no observation rows')
  }
  if (records.length > maxCsvRows) {
    throw new CsvUploadError(`A single upload can contain at most ${maxCsvRows} observation rows`)
  }

  const allowedColumns = new Set(['observedBy', 'survivingTrees', 'observedAt', 'plotId', 'notes'])
  const columns = Object.keys(records[0] ?? {})
  const unknownColumns = columns.filter((column) => !allowedColumns.has(column))
  if (unknownColumns.length > 0) {
    throw new CsvUploadError(`Unsupported CSV column: ${unknownColumns.join(', ')}`)
  }
  if (!columns.includes('observedBy') || !columns.includes('survivingTrees')) {
    throw new CsvUploadError('CSV must include observedBy and survivingTrees columns')
  }

  const plotIds = new Set<string>()
  const observations = records.map((record, index) => {
    const rowNumber = index + 2
    const observedBy = record.observedBy?.trim()
    if (!observedBy || observedBy.length > 120) {
      throw new CsvUploadError(`Row ${rowNumber}: observedBy is required and must be at most 120 characters`)
    }

    const treeCount = record.survivingTrees?.trim()
    const survivingTrees = Number(treeCount)
    if (!treeCount || !/^\d+$/.test(treeCount) || !Number.isSafeInteger(survivingTrees)) {
      throw new CsvUploadError(`Row ${rowNumber}: survivingTrees must be a non-negative whole number`)
    }

    const observedAt = record.observedAt ? new Date(record.observedAt) : new Date()
    if (Number.isNaN(observedAt.getTime())) {
      throw new CsvUploadError(`Row ${rowNumber}: observedAt must be a valid date`)
    }

    const notes = record.notes?.trim()
    if (notes && notes.length > 2000) {
      throw new CsvUploadError(`Row ${rowNumber}: notes must be at most 2000 characters`)
    }

    const plotId = record.plotId?.trim()
    if (plotId) {
      if (!mongoose.isValidObjectId(plotId)) {
        throw new CsvUploadError(`Row ${rowNumber}: plotId must be a valid MongoDB ObjectId`)
      }
      plotIds.add(plotId)
    }

    return {
      siteId: site._id,
      observedBy,
      survivingTrees,
      observedAt,
      ...(notes ? { notes } : {}),
      ...(plotId ? { plotId } : {}),
      source: 'csv' as const,
    }
  })

  if (plotIds.size > 0) {
    const matchingPlots = await PlotModel.find({
      _id: { $in: [...plotIds] },
      siteId: site._id,
    }).distinct('_id')
    const matchingPlotIds = new Set(matchingPlots.map((id) => id.toString()))
    const unrelatedPlot = [...plotIds].find((id) => !matchingPlotIds.has(id))
    if (unrelatedPlot) {
      throw new CsvUploadError('A plotId does not belong to the selected site')
    }
  }

  await ObservationModel.insertMany(observations, { ordered: true })
  return observations.length
}

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