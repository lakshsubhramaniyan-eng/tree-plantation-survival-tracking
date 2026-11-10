import assert from 'node:assert/strict'
import { test } from 'node:test'
import mongoose from 'mongoose'
import { ObservationModel } from '../server/models/Observation.js'
import { PlotModel } from '../server/models/Plot.js'
import { SiteModel } from '../server/models/Site.js'

test('site requires a name, region, and planted tree count', () => {
  const error = new SiteModel({}).validateSync()
  assert.ok(error?.errors.name)
  assert.ok(error?.errors.region)
  assert.ok(error?.errors.plantedTrees)
})

test('site applies defaults to valid data', () => {
  const site = new SiteModel({ name: 'North Grove', region: 'North', plantedTrees: 100 })
  assert.equal(site.validateSync(), undefined)
  assert.equal(site.targetSurvivalRate, 80)
  assert.equal(site.status, 'active')
})

test('site rejects survival targets above 100 percent', () => {
  const site = new SiteModel({ name: 'North Grove', region: 'North', plantedTrees: 100, targetSurvivalRate: 101 })
  assert.ok(site.validateSync()?.errors.targetSurvivalRate)
})

test('plot rejects surviving trees greater than planted trees', () => {
  const plot = new PlotModel({ siteId: new mongoose.Types.ObjectId(), name: 'Plot A', plantedTrees: 10, survivingTrees: 11 })
  assert.ok(plot.validateSync()?.errors.survivingTrees)
})

test('plot accepts surviving trees within the planted count', () => {
  const plot = new PlotModel({ siteId: new mongoose.Types.ObjectId(), name: 'Plot A', plantedTrees: 10, survivingTrees: 7 })
  assert.equal(plot.validateSync(), undefined)
})

test('observation defaults its source to manual', () => {
  const observation = new ObservationModel({ siteId: new mongoose.Types.ObjectId(), observedBy: 'Surveyor', survivingTrees: 7 })
  assert.equal(observation.validateSync(), undefined)
  assert.equal(observation.source, 'manual')
  assert.ok(observation.observedAt instanceof Date)
})
