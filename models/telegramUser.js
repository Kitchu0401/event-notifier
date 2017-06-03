var mongoose = require('mongoose')

var schema = new mongoose.Schema({
  id: Number,
  tags: [String],
  active: Number
})

module.exports = mongoose.model('telegramUser', schema)
