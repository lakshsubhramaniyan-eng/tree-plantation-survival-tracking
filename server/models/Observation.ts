import mongoose, { type InferSchemaType } from 'mongoose'

const observationSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    plotId: {
      type: mongoose.Schema.Types.ObjectId,
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
export const ObservationModel = mongoose.models.Observation || mongoose.model('Observation', observationSchema)