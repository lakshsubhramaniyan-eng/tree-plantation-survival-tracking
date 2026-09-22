import mongoose, { type InferSchemaType } from 'mongoose'

const plotSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    name: {
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
    survivingTrees: {
      type: Number,
      required: true,
      min: 0,
    },
    lastSurveyedAt: Date,
  },
  { timestamps: true },
)

plotSchema.path('survivingTrees').validate(function (survivingTrees: number) {
  return survivingTrees <= this.plantedTrees
}, 'Surviving trees cannot exceed planted trees')

plotSchema.index({ siteId: 1, name: 1 }, { unique: true })

export type Plot = InferSchemaType<typeof plotSchema>
export const PlotModel = mongoose.models.Plot || mongoose.model('Plot', plotSchema)