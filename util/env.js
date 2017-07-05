module.exports = process.argv.reduce(function(env, value, index, a) {
  let key;
  switch (index) {
    case 1:   key = 'path';   break;
    case 2:   key = 'mode';   break;
    case 3:   key = 'batch';  break;
    default:  return env;
  }
  env[key] = value
  return env
}, {})
