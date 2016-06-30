var express = require('express');
var port = process.env.PORT || 1337;
var app = express();
 

 
app.get('/', function (req, res) {
     console.log('test_start')
  res.send('Hello Express World!');
  console.log('test_end')
});
 
app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!');
});

