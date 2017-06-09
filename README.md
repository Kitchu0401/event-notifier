# Event-notifier

**키워드 기반**으로 모임에 대한 정보를 **텔레그램 챗봇**을 통해 알려주는 application입니다.

![guide-4.png](/public/images/guide-4.png)

# Event-source

`2017-06-08` 기준 아래의 사이트에서 10여분 단위의 웹-크롤링을 통해 정보를 추출하여 제공하고 있습니다.

추후 다른 소스를 알게되면 추가 할 수 있겠죠. 나쁜사람 아닙니다, 크롤링을 막지 말아주세요. ヾ(;ﾟДﾟ;)ｼ

- [onoffmix.com](http://onoffmix.com/)

# Usage

간단합니다! **Telegram** 메신저를 설치 후, `@OomEventNotifierBot`을 추가해주세요.

`/start` 커맨드로 바로 아이디를 발급받을 수 있으며, [웹페이지](http://kitchu.lazecrew.com/event/subscriber)에서 즉시 키워드를 추가하시면 모든 준비는 끝납니다!

# Installation

## npm

서비스 셋업을 위해 다음의 기본적인 과정을 수행합니다.

``` sh
git clone <REPOSITORY_URL>

npm install
```

## mongodb

기본 포트의 **Mongodb**를 데이터베이스로 사용합니다.

설치는 [공식 도큐먼트](https://www.mongodb.com/download-center)를 참조해주세요.

## telegram-bot-webhook

telegram bot 메시지 수신을 통한 상태 업데이트를 위해 **WebHook**을 사용합니다.

`2017-06-08` 기준 webHook 설정을 위해:

- **self-signed certification**을 사용합니다.

  [공식 가이드: Marvin's Marvellous Guide to All Things Webhook](https://core.telegram.org/bots/webhooks#a-self-signed-certificate)를 참조해주세요.

- telegram rest api setWebHook을 통해 webHook을 설정한 후, 별도의 https 요청(**8443 포트**)을 받아 처리하고 있습니다.

  역시 [공식 가이드: Marvin's Marvellous Guide to All Things Webhook](https://core.telegram.org/bots/webhooks#how-do-i-set-a-webhook-for-either-type)에서 해당 cli 요청 코드를 확인하실 수 있습니다.

  ``` sh
  curl -F "url=https://<YOURDOMAIN.EXAMPLE>/<WEBHOOKLOCATION>" -F "certificate=@<YOURCERTIFICATE>.pem" https://api.telegram.org/bot<YOURTOKEN>/setWebhook
  ```

추후 도메인 전체를 위한 인증서를 적용하고, 서비스 구동시 동적으로 webHook을 설정하도록 변경 할 계획입니다.

## static config file

서비스 내부에서 다음과 같은 구조의 json 파일을 설정 파일로 사용하고 있습니다.

추후 리팩토링과 함께 변경될 가능성이 높습니다.

``` js
module.exports = {

  // 서비스 구동 포트
  port: number-port,

  onoffmixEventNotifier: {
    // 배치 프로세스 구분을 위한 Name String
    jobName: 'string-job-name',
    // 크롤링 대상 url (온오프믹스)
    url: 'string-url',
    // 배치 작업 간격 (null일 경우 동적 간격을 적용합니다)
    fixedInterval: number-fixed-interval,
    // 텔레그램 봇 연동을 위한 token
    telegramBotToken: 'string-telegram-bot-token'
  },

  webHook: {
    // self-signed certificate 적용을 위한 물리 key 파일 경로
    key: 'string-key-file-path',
    cert: 'string-pem-file-path'
  }

}
```
