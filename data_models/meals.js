// require mongoose and setup the Schema
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// define the meals schema
var mealSchema = new Schema({
  "id": {
    "type": Number,
    "unique": true
  },
  "name": String,
  "description": String,
  "price": Number,
  "category": String,
  "num_meals": Number,
  "image_url": {
    "type": String,
    "unique": true
  },
  "is_top": Boolean
});

module.exports = mongoose.model("meals", mealSchema);