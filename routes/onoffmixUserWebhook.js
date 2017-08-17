const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const TelegramBot = require('node-telegram-bot-api')

const config = require('./../config')
const bot = new TelegramBot(config.telegramBotToken)

// mongoose models
const User = require('./../models/user')

const router = express.Router()

router.post('/', function (req, res, next) {
  const message = req.body.message
  if ( message.text === '/start' ) {
    User
      .findOne({ id: message.chat.id })
      .then((found) => {
        // 사용자가 이미 등록 되어있는 경우, 사용자에게 id만 반환한다.
        if ( found ) {
          let messageContent = `이미 등록된 사용자입니다: *${message.chat.id}*`
          bot.sendMessage(message.chat.id, messageContent, { parse_mode: 'Markdown' })
          res.sendStatus(200)
        }
        // 등록된 사용자가 아닐 경우, 사용자를 등록 후 안내한다.
        else {
          let user = message.from
          user.tags = []
          user.tags_neg = []
          user.active = 1

          new User(user)
            .save()
            .then((saved) => {
              let messageContent = `사용자 정보가 등록되었습니다: *${message.chat.id}*\nhttp://kitchu.lazecrew.com/event/subscriber 에서 모임 소식을 받아볼 키워드를 등록해주세요!`
              bot.sendMessage(message.chat.id, messageContent, { parse_mode: 'Markdown' })
              res.sendStatus(200)
            })
        }
      })
      .catch((error) => {
        console.log(message)
        console.error(error)
        let messageContent = `오류가 발생했습니다.\n관리자에게 문의해주세요!`
        bot.sendMessage(message.chat.id, messageContent, { parse_mode: 'Markdown' })
        res.sendStatus(200)
      })
  } else {
    // return 200 status
    res.sendStatus(200)
  }
})

module.exports = router