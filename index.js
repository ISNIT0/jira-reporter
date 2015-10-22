var jira = require('jira-api');
var Mustache = require('mustache');
var request = require('request');
var fs =  require('fs');

var summaryTemplate = fs.readFileSync(__dirname + '/summaryTemplate.mustache', 'utf8');
var reportTemplate = fs.readFileSync(__dirname + '/reportTemplate.mustache', 'utf8');

module.exports = function(config){

  var options = {
    config: {
      host:config.host,
      username:config.username,
      password:config.password,
      port:config.port
    }
  };
  if(!config)
    return Object;

  return function(results, opts, done) {
    console.log('Jira-Reporter is go...');

    Object.keys(results.modules).map(function(key){
      results.modules[key].module = key;
      return results.modules[key];
    }).filter(function(item){
      return item.failures > 0;
    }).map(function(item){
      item.failed = Object.keys(item.completed).reduce(function(a, b){
        var ret = item.completed[b];
        ret.name = b;
        return a.concat(ret);
      }, []).filter(function(item){
        console.log(item)
        return item.failed;
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
    var filePath = fileDir + '\\' +fs.readdirSync(fileDir).
    sort(function(a, b){
      return a > b;
    })[0];
    var issueModule = issue.module;
    delete issue.module;
    options.data = {
      fields:issue
    };
    jira.issue.post(options, function(response) {
      if(response){
        if (response && response.errors && response.errors.length)
          return console.error(response.errors);

        var url = Mustache.render('https://{{host}}/rest/api/2/issue/'+response.key+'/attachments', config);

        request.post({ //Screenshot
          url:url,
          headers: {
            'X-Atlassian-Token':'nocheck'
          },
          auth:{
            user:config.username,
            pass:config.password
          },
          formData: {
            file: fs.createReadStream(filePath)
          }
        }, function(err, res){
          console.error(err);
        });

        var rdp = Mustache.render('full address:s:{{host}}\nusername:s:{{defaultUser}}\nprompt for credentials on client:i:1', {
          host:require('os').hostname(),
          defaultUser:'squpinternal\administrator'
        });

        var runRemoteTests = Mustache.render('psexec -s -d -i 2 \\{{host}} -w "C:\Tests" cmd /k "npm test -- --test tests\{{module}}"', {
          module:issueModule,
          host:require('os').hostname()
        });

        request.post({ //RDP Connection
          url:url,
          headers: {
            'X-Atlassian-Token':'nocheck'
          },
          auth:{
            user:config.username,
            pass:config.password
          },
          formData: {
            file: {
              value: 'echo \"' + rdp + '\" > tmp.rdp ; mstsc tmp.rdp ; ' + runRemoteTests,
              options: {
              filename: require('os').hostname()+'.bat',
              contentType: 'bat/bat'
            }
          }
        }
                     }, function(err, res){
          console.error(err);
        });

      };
    });
  });
  done();
};
};
