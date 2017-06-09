const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const bluebird = require('bluebird')
const schedule = require('node-schedule')
const _config = require('./config')

const app = express()
const port = _config.port || 8080

// middlewares
app.set('view engine', 'pug')
app.set('views', 'views')
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// serving static files
app.use('/event/subscriber/static', express.static('public'))

// routers
app.use('/event/subscriber', require('./routes/onoffmixEventSubscriber'))
app.use('/event/webhook', require('./routes/onoffmixUserWebhook'))

// mongoose setup
const db = mongoose.connection
      db.on('error', console.error)
      db.once('open', () => { console.log('Connected to mongodb server.') })
mongoose.Promise = bluebird
mongoose.connect('mongodb://localhost/bd')

// 배치 프로세스 start
// 온오프믹스 모임 정보 크롤링: 매 12분 마다 수행
schedule.scheduleJob('*/12 * * * *', require('./batchs/onoffmixEventNotifier').run)

app.listen(port, () => {
  console.log('Express is listening on port ' + port)
})

// 임시 Https 프로토콜 연동
const https = require('https')
const fs = require('fs')
const _webHookConfig = _config.webHook
const _webHookOptions = {
  key: fs.readFileSync(_webHookConfig.key),
  cert: fs.readFileSync(_webHookConfig.cert)
}
https.createServer(_webHookOptions, app).listen(8443, () => {
  console.log('Temp https server is listening on port ' + 8443)
})
