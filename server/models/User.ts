import mongoose, { type InferSchemaType } from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-z0-9_]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true },
)

export type User = InferSchemaType<typeof userSchema>
export const UserModel = mongoose.models.User || mongoose.model('User', userSchema)