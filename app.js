// required modules
var express = require("express");
var graph = require("fbgraph");
var path = require("path");
var http = require("http");

var app = express();

app.configure(function(){
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname,"./public")));
	app.set("port", process.env.PORT || 3000);
});

// configurable vars
var configs = require("./config/config.json");

// comments that Fubot will do
var comments = configs.comments;

// setting your access_token
graph.setAccessToken(configs.AccessToken);

var comment = {
  message: comments.outgoing[Math.floor(Math.random()*comments.outgoing.length)] + " :)"
};

// total response count
var count = 0;

// trying to check that is this a wish or not
// this is the worst part, can't be 100% sure :|
var isWish = function(message){
	var pattern = /(hap{1,}(y{1,}||i{1,}))||((birthday)||(b(\')*day))/i;

	if(message.match(pattern))
		{return true;}
	else
		{return false;}
}

// it communicates
var sayThanks = function(ID){
	// it comments
	graph.post(ID + "/comments", comment, function(err, res) {
  		// returns your reply comment-post id
  		console.log(res);
	});

	// it likes
	graph.post(ID + "/likes", function(err, res){
		// return bool `true` if done
		console.log(res);
	});
}

// limiting timestamp
var cursor = 1385721548;

// perform query and work on result data
var cronJob = function() {

	// fql query to retrieve needed data
	var query = {
		result : "SELECT post_id, actor_id, message, created_time FROM stream WHERE source_id = me() AND filter_key = 'others' AND created_time > " + cursor,
	};

	graph.fql(query, function(err, res){
		console.log(res.data[0].fql_result_set);

		var latest = res.data[0].fql_result_set;
		var total = latest.length;

		if(total>0){

			// tracking the result arrayreverse 
			// because facebook returns fql result as in higher timestamp to lower timestamp
			for(var i=total-1; i>=0; i--)
			{
				postID = latest[i].post_id;

				if(isWish(latest[i].message))
				{
					sayThanks(postID);
					count++;
				}
			}

			// updating limiting time after done with all latest
			if(isWish(latest[0].message))
			{
				cursor = latest[0].created_time;
				console.log("cursor is changed to " + cursor);
				console.log("its " + count);
			}
		}

		else
		{
			console.log("nothing");
		}
	});
}

cronJob();
// repeating after each 30 seconds
setInterval(cronJob, 30000);

app.get("/", function(req,res){
	res.send(count + " responses and counting..");
});

http.createServer(app).listen((process.env.PORT || 3000), function(){
	console.log("Express server running on port " + app.get("port"));
});
