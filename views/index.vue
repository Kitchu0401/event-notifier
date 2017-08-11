<template lang="html">
  <div id="app">
    <navigator
      :title="title"
      :user-count="userCount"
      :tag-count="tagCount">
    </navigator>
    <div class="container" style="padding: 20px;">
      <div class="columns">
        <div class="column is-offset-2 is-8">
          <login
            :form-id="formId"
            :login="login">
          </login>
        </div>
      </div>
      <guide></guide>
    </div>
  </div>
</template>

<script>
export default {
  data: function() {
    return {
      formId: '',
      formTag: '',
      tagType: 'tags_pos',
      errorMsg: '',
      user: null
    }
  },
  mounted: function () {
    // // 직전 로그인에 성공했다면 해당 TelegramUserId를 input에 자동으로 할당한다.
    // this.formId = localStorage.getItem('eventnotifier-last-login-id') || ''
    // 
    // $('input[name="formId"]').focus()
  },
  methods: {
    login: function () {
      // TODO
      console.debug('index.login() called!')
      return

      $.getJSON('/event/subscriber/' + this.formId, function (result) {
        if ( result.success ) {
          // 로그인시 로그인에 성공한 TelegramUserId를 로컬 저장소에 저장한다.
          localStorage.setItem('eventnotifier-last-login-id', result.user.id)

          this.user = result.user
          this.user.tags.sort()
          this.user.tags_neg.sort()

          $('input[name="formTag"]').focus()
        } else {
          alert(result.message)
        }
      }.bind(this))
    },
    loadTagList: function (e) {
      let code = e.which || e.keyCode
      if ( code !== 13 && code !== 9 ) {
        this.formTag = e.target.value
      }
    },
    addTag: function () {
      if ( this.validate(this.tagType) === false ) { return }
      
      let id = this.user.id
      let tagType = this.tagType
      let tag = this.formTag

      $.ajax({
        url: '/event/subscriber/tag',
        type: 'PUT',
        dataType: 'json',
        data: { id: id, tagType: tagType, tag: tag }
      })
      .done(function (result) {
        if ( result.success ) {
          this.user[tagType].push(this.formTag)
          this.user[tagType].sort()
          this.formTag = ''
        } else {
          this.showError(result.message)
        }
      }.bind(this))
    },
    removeTag: function (index, tagType) {
      let id = this.user.id
      let tag = this.user[tagType][index]
      
      $.ajax({
        url: '/event/subscriber/tag',
        type: 'DELETE',
        dataType: 'json',
        data: { id: id, tagType: tagType, tag: tag }
      })
      .done(function (result) {
        if ( result.success ) {
          this.user[tagType].splice(index, 1)
          this.user[tagType].sort()
        } else {
          this.showError(result.message)
        }
      }.bind(this))
    },
    validate: function (tagType) {
      console.log(this.formTag, this.tagType)
      try {
        if ( this.formTag.length < 2 || this.formTag.length > 10 ) throw '키워드는 2글자 이상 10글자 이하로 입력해주세요.'
        if ( this.user[tagType].includes(this.formTag) ) throw '이미 등록한 키워드입니다.'
        if ( this.user[tagType].length >= 50 ) throw '키워드는 50개까지 등록 가능합니다.'
      } catch (error) {
        this.showError(error)
        return false
      }
      return true
    },
    showError: function (message) {
      clearTimeout(this.errorTimeout)
      this.errorMsg = message
      this.errorTimeout = setTimeout(function () { this.errorMsg = '' }.bind(this), 3000)
    }
  }
}
</script>

<style lang="css">
/* style for vue.js transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity .5s
}
.fade-enter, .fade-leave-to {
  opacity: 0
}
.button-group > .button:first-of-type {
  border-top-right-radius: 0px;
  border-bottom-right-radius: 0px;
}
.button-group > .button:last-of-type {
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
}
.tag-list { text-align: center; /* margin-bottom: .75rem; */ }
.tag-list .tag-header { padding: 6px; margin: 0px 0px 12px; color: #7a7a7a; border-bottom: 1px solid #7a7a7a; }
.tag-list .tag { margin-right: 8px; margin-bottom: 8px; }
</style>
