<template lang="html">
  <div class="columns">
    <div class="column is-offset-2 is-8">
      <div class="level">
        <div class="level-item level-center">
          <div class="field">
            <p class="control">
              <p class="is-centered" style="margin-bottom: 6px;">Type ID and press enter!</p>
              <input type="text" class="input" name="formId" ref="formId" v-model="formId" v-on:keyup.enter.stop="login">
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: [
    'formId'
  ],
  mounted: function () {
    // 직전 로그인에 성공했다면 해당 TelegramUserId를 input에 자동으로 할당한다.
    this.formId = localStorage.getItem('eventnotifier-last-login-id') || ''
    this.$refs.formId.focus()
  },
  methods: {
    login: function () {
      $.getJSON('/event/subscriber/' + this.formId, function (result) {
        if ( result.success ) {
          // 로그인시 로그인에 성공한 TelegramUserId를 로컬 저장소에 저장한다.
          localStorage.setItem('eventnotifier-last-login-id', result.user.id)
          this.$emit('login', result.user)
        } else {
          alert(result.message)
        }
      }.bind(this))
    }
  }
}
</script>
