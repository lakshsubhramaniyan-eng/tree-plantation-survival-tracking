import mongoose from 'mongoose'

export async function connectDatabase() {
  const connectionString = process.env.MONGODB_URI

  if (!connectionString) {
    throw new Error('MONGODB_URI is required to start the API server')
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  await mongoose.connect(connectionString, {
    serverSelectionTimeoutMS: 5000,
  })

  return mongoose.connection
}