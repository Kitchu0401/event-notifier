const express = require('express')
const mongoose = require('mongoose')
const TelegramUser = require('./../models/telegramUser')

const router = express.Router()

// GET receipt list
router.get('/', function (req, res, next) {
  res.send('DONE')
})

module.exports = router
