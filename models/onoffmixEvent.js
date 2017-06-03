const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  index: String,
  thumbnail: String,
  link: String,
  title: String,
  extractTime: String
})

module.exports = mongoose.model('onoffmix.event', schema)