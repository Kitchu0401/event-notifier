# Event-notifier

**키워드 기반**으로 모임에 대한 정보를 **텔레그램 챗봇**을 통해 알려주는 application입니다.

# Event-source

`2017-06-08` 기준 아래의 사이트에서 10여분 단위의 웹-크롤링을 통해 정보를 추출하여 제공하고 있습니다.

추후 다른 소스를 알게되면 추가 할 수 있겠죠. 나쁜사람 아닙니다, 크롤링을 막지 말아주세요. ヾ(;ﾟДﾟ;)ｼ

- [onoffmix.com](http://onoffmix.com/)

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

- **self-signed certification**을 사용합니다. [공식 가이드 문서]()를 참조해주세요.

- telegram rest api setWebHook을 통해 webHook을 설정한 후, 별도의 https 요청을 받아 처리하고 있습니다.

  ``` sh
  curl <TELEGRAM_SETWEBHOOK_REST_API_URL> -F <CERTIFICATE_KEY_FILE_PATH> <MY_WEBHOOK_URL>
  ```

추후 도메인 전체를 위한 인증서를 적용하고, 서비스 구동시 동적으로 webHook을 설정하도록 변경 할 계획입니다.
