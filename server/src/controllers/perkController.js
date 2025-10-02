import Joi from 'joi';
import { Perk } from '../models/Perk.js';
import mongoose from 'mongoose';

// validation schema for creating/updating a perk
const perkSchema = Joi.object({
  // check that title is at least 2 characters long, and required
  title: Joi.string().min(2).required(),
  // description is optional
  description: Joi.string().allow(''),
  // category must be one of the defined values, default to 'other'
  category: Joi.string().valid('food','tech','travel','fitness','other').default('other'),
  // discountPercent must be between 0 and 100, default to 0
  discountPercent: Joi.number().min(0).max(100).default(0),
  // merchant is optional
  merchant: Joi.string().allow('')

}); 

  

// Filter perks by exact title match if title query parameter is provided 
export async function filterPerks(req, res, next) {
  try {
    const { title } = req.query     ;
    if (title) {
      const perks = await Perk.find ({ title: title}).sort({ createdAt: -1 });
      console.log(perks);
      res.status(200).json(perks)
    }
    else {
      res.status(400).json({ message: 'Title query parameter is required' });
    }
  } catch (err) { next(err); }
}


// Get a single perk by ID 
export async function getPerk(req, res, next) {
  try {
    const perk = await Perk.findById(req.params.id);
    console.log(perk);
    if (!perk) return res.status(404).json({ message: 'Perk not found' });
    res.json({ perk });
    // next() is used to pass errors to the error handling middleware
  } catch (err) { next(err); }
}

// get all perks
export async function getAllPerks(req, res, next) {
  try {
    const perks = await Perk.find().sort({ createdAt: -1 });
    res.json(perks);
  } catch (err) { next(err); }
}

// Create a new perk
export async function createPerk(req, res, next) {
  try {
    // validate request body against schema
    const { value, error } = perkSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
     // ...value spreads the validated fields
    const doc = await Perk.create({ ...value});
    res.status(201).json({ perk: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate perk for this merchant' });
    next(err);
  }
}
// TODO
// Update an existing perk by ID and validate only the fields that are being updated 
// Update an existing perk by ID and validate only the fields that are being updated 
export async function updatePerk(req, res, next) {
  try {
    const { id } = req.params;

    // 1) Validate ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid perk id' });
    }

    // 2) Allow only these fields (matches your Joi/create schema)
    const allowed = ['title', 'description', 'category', 'discountPercent', 'merchant'];

    // Keep only allowed keys and ignore undefined
    const update = Object.fromEntries(
      Object.entries(req.body || {}).filter(
        ([k, v]) => allowed.includes(k) && v !== undefined
      )
    );

    // 3) If nothing valid to update, return the current doc (last known values)
    if (Object.keys(update).length === 0) {
      const current = await Perk.findById(id);
      if (!current) return res.status(404).json({ message: 'Perk not found' });
      return res.status(200).json(current);
    }

    // 4) Validate only provided fields (partial validation)
    const partialSchema = Joi.object({
      title: Joi.string().min(2),
      description: Joi.string().allow(''),
      category: Joi.string().valid('food', 'tech', 'travel', 'fitness', 'other'),
      discountPercent: Joi.number().min(0).max(100),
      merchant: Joi.string().allow('')
    });

    const { error } = partialSchema.validate(update, { abortEarly: false });
    if (error) return res.status(400).json({ message: error.message });

    // 5) Perform the update (unchanged fields remain as last known values)
    const updated = await Perk.findByIdAndUpdate(
      id,
      { $set: update },
      {
        new: true,           // return the updated document (includes unchanged fields)
        runValidators: true, // apply mongoose validators
        upsert: false
      }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Perk not found' });
    }

    // 6) Success: return the full doc with updated + unchanged (last known) values
    return res.status(200).json(updated);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate perk for this merchant' });
    }
    return next(err);
  }
}

  
  
  



// Delete a perk by ID
export async function deletePerk(req, res, next) {
  try {
    const doc = await Perk.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Perk not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
