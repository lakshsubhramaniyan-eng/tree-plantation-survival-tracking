import mongoose, { type InferSchemaType } from 'mongoose'

const siteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    region: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    plantedTrees: {
      type: Number,
      required: true,
      min: 0,
    },
    targetSurvivalRate: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true },
)

siteSchema.index({ region: 1, status: 1 })
siteSchema.index({ name: 1, region: 1 }, { unique: true })

export type Site = InferSchemaType<typeof siteSchema>
export const SiteModel = (mongoose.models.Site as mongoose.Model<Site> | undefined) || mongoose.model<Site>('Site', siteSchema)