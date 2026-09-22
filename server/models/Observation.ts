import { model, models, Schema, type InferSchemaType } from 'mongoose'

const observationSchema = new Schema(
  {
    siteId: {
      type: Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    plotId: {
      type: Schema.Types.ObjectId,
      ref: 'Plot',
      index: true,
    },
    observedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    observedBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    survivingTrees: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    source: {
      type: String,
      enum: ['manual', 'csv'],
      default: 'manual',
    },
  },
  { timestamps: true },
)

observationSchema.index({ siteId: 1, observedAt: -1 })

export type Observation = InferSchemaType<typeof observationSchema>
export const ObservationModel = models.Observation || model('Observation', observationSchema)