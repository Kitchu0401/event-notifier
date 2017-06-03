// const request = require('request')
// const cheerio = require('cheerio')
const express = require('express')
const mongoose = require('mongoose')
const moment = require('moment')
// const TelegramBot = require('node-telegram-bot-api')
const config = require('./config')

// mongoose setup
const db = mongoose.connection
      db.on('error', console.error)
      db.once('open', () => { console.log('Connected to mongodb server.') })
mongoose.connect('mongodb://localhost/bd')

require('./batchs/onoffmixEventNotifier').run()
