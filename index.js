var jira = require('jira-api');
var Mustache = require('mustache');

var summaryTemplate = require('fs').readFileSync(__dirname + '/summaryTemplate.mustache', 'utf8');
var reportTemplate = require('fs').readFileSync(__dirname + '/reportTemplate.mustache', 'utf8');

module.exports = function(config){

  var options = {
    config: {
      host:config.host,
      username:config.username,
      password:config.password,
      port:config.port
    }
  };


  return function(results, opts, done) {
    console.log('Jira-Reporter is go...');

      Object.keys(results.modules).map(function(key){
        results.modules[key].module = key;
        return results.modules[key];
      }).filter(function(item){
        return item.failures > 0 || item.errors > 0;
      }).map(function(item){
        item.failed = Object.keys(item.completed).reduce(function(a, b){
          var ret = item.completed[b];
          ret.name = b;
          return a.concat(ret);
        }, []).filter(function(item){
          return item.failed || item.errors;
        });
        return item;
      }).reduce(function(a, b){

        var ret = {
          module:b.module,
          summary: Mustache.render(config.summaryTemplate || summaryTemplate, b),
          description: Mustache.render(config.reportTemplate || reportTemplate, b),
          labels: b.module.split(/\\|\//g).concat(config.labels || []),
          issuetype: { name: config.issueType || 'TestFail'},
          project: { key: config.project || 'TEST' },
        };

        return a.concat(ret);
      }, []).forEach(function(issue){
        var fileDir = config.projectRoot + config.imgPath + issue.module.split(/\\|\//g).join('\\');
        var filePath = fileDir + '\\' + require('fs').readdirSync(fileDir).
        sort(function(a, b){
          return a > b;
        })[0];
        delete issue.module;
        options.data = {
          fields:issue,
          file:filePath
        };
        jira.issue.post(options, function(err, response) {
          if (err.errors && err.errors.length)
            console.error(err.errors);
        });
      });
    done();
  };
};
