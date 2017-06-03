var mongoose = require('mongoose')

var schema = new mongoose.Schema({
  index: String,
  thumbnail: String,
  link: String,
  title: String,
  extractTime: String
})

module.exports = mongoose.model('event', schema)