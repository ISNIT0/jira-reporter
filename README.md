# Nightwatch jira-reporter

See https://github.com/nightwatchjs/nightwatch-docs/blob/master/guide/extending-nightwatch/custom-reporter.md

```bash
npm i jira-reporter
```

### nightwatchDir/jira-reporter.js
```javascript
module.exports = {
  write : require('jira-reporter')(require('./config.json').jira)
};
```

```bash
nightwatch --reporter ./jira-reporter.js
```
