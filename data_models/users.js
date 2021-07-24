// require mongoose and setup the Schema
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// define the users schema
var userSchema = new Schema({
  "email": {
    "type": String,
    "unique": true
  },
  "first_name": String,
  "last_name": String,
  "address": String,
  "city": String,
  "postal": String,
  "password": String // Store encrypted -> Hash - how?
});

//let User = mongoose.model("users", userSchema);
module.exports = mongoose.model("users", userSchema);