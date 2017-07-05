const express = require('express')
const logger = require('morgan')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const bluebird = require('bluebird')
const schedule = require('node-schedule')
const config = require('./config')
const env = require('./util/env')

const app = express()
const port = config.port || 8080

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

if ( env.batch != 'false' ) {
  // *    *    *    *    *    *
  // ┬    ┬    ┬    ┬    ┬    ┬
  // │    │    │    │    │    |
  // │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
  // │    │    │    │    └───── month (1 - 12)
  // │    │    │    └────────── day of month (1 - 31)
  // │    │    └─────────────── hour (0 - 23)
  // │    └──────────────────── minute (0 - 59)
  // └───────────────────────── second (0 - 59, OPTIONAL)
  const onoffmixSource = require('./batchs/source.onoffmix')
  const devmeetupSource = require('./batchs/source.devmeetup')

  // 배치 프로세스 with Node-scheduler
  // 온오프믹스 모임 정보 수집 배치: 매 12분 마다 수행
  schedule.scheduleJob('0,12,24,36,48 * * * *', onoffmixSource.run)
  // 데브밋업 모업 정보 수집 배치: 매 12분 + 6분 마다 수행
  schedule.scheduleJob('6,18,30,42,54 * * * *', devmeetupSource.run)
}

app.listen(port, () => {
  console.log('Express is listening on port ' + port)
})

if ( env.mode != 'dev' ) {
  // 임시 Https 프로토콜 연동
  const https = require('https')
  const fs = require('fs')
  const _webHookConfig = config.webHook
  const _webHookOptions = {
    key: fs.readFileSync(_webHookConfig.key),
    cert: fs.readFileSync(_webHookConfig.cert)
  }
  https.createServer(_webHookOptions, app).listen(8443, () => {
    console.log('Temp https server is listening on port ' + 8443)
  })
}
