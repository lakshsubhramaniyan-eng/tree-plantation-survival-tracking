import { model, models, Schema, type InferSchemaType } from 'mongoose'

const plotSchema = new Schema(
  {
    siteId: {
      type: Schema.Types.ObjectId,
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
export const PlotModel = models.Plot || model('Plot', plotSchema)