<template lang="html">
  <nav class="nav has-shadow">
    <nav class="nav-left">
      <nav class="nav-item" style="width: 160px;">
        <strong>{{ title }}</strong>
        <a class="icon" href="https://github.com/Kitchu0401/event-notifier/" style="margin-left: 4px;">
          <i class="fa fa-github"></i>
        </a>
      </nav>
    </nav>
    <nav class="nav-center is-hidden-mobile">
      <span class="nav-item has-text-centered">
        <strong>{{ userCount }}</strong> &nbsp;
        <span>subscribers,</span> &nbsp;
        <strong>{{ tagCount }}</strong> &nbsp;
        <span>keywords.</span> &nbsp;
      </span>
    </nav>
    <nav class="nav-right">
      <a class="nav-item" href="http://onoffmix.com/" style="width: 160px;">
        <strong>onoffmix.com</strong>
      </a>
    </nav>
  </nav>
</template>

<script>
export default {
  props: [
    'title',
    'userCount',
    'tagCount'
  ]
}
</script>

<style lang="css">
</style>
