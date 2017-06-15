const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  index: String,
  thumbnail: String,
  link: String,
  title: String,
  content: String,
  extractTime: String
})

class Event {
  static getRecentEventList () {
    return this.find().sort({ extractTime: -1 }).select('title link').limit(10)
  }
}

schema.loadClass(Event)
module.exports = mongoose.model('onoffmix.event', schema)