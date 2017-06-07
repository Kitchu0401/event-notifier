const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const TelegramBot = require('node-telegram-bot-api')

const _config = require('./../config')['onoffmixEventNotifier']
const bot = new TelegramBot(_config.telegramBotToken)

// mongoose models
const User = require('./../models/telegramUser')

const router = express.Router()

router.post('/', function (req, res, next) {
  var message = req.body.message
  bot.sendMessage(message.chat.id, 'Recieved: ' + message.text)
  res.sendStatus(200)
})

module.exports = router