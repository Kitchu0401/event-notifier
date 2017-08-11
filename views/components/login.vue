<template lang="html">
  <div class="level">
    <div class="level-item level-center">
      <div class="field">
        <p class="control">
          <p class="is-centered" style="margin-bottom: 6px;">Type ID and press enter!</p>
          <input type="text" class="input" name="formId" v-model="formId" v-on:keyup.enter.stop="login">
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: [
    'formId',
    'login'
  ]
}
</script>
