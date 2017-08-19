<template lang="html">
  <div class="panel">
    <div class="panel-heading" style="text-align: center;">최근 등록된 모임들</div>
    <div class="panel-block" v-show="eventList.length > 0" v-for="event in eventList">
      <a href="event.link" target="_blank">Link &nbsp;</a>
      <span>{{ event.title }}</span>
    </div>
    <div class="panel-tabs" v-show="eventList.length <= 0">
      <p style="margin: 8px 0px;">확인된 모임이 없습니다. :(</p>
    </div>
  </div>
</template>

<script>
export default {
  props: [
    'eventList'
  ]
}
</script>
