//jshint esversion:6

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const _ = require('lodash');
const he = require('he');
const time = require(__dirname + '/time.js');
const date = require(__dirname + '/date.js');
const https = require('https');
const request = require('request');
let k = 1;
//mongoose setup
mongoose.connect('mongodb+srv://Admin-Anish:13ANN%23MAJ13@mycluster0-tyf2i.mongodb.net/blogDB', {
	useFindAndModify   : false,
	useUnifiedTopology : true,
	useNewUrlParser    : true
});
//app setup
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

//default content creation for home, about, contact
const aboutContent =
	'Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.';
const contactContent =
	'Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.';
//id schema
const linksSchema = new mongoose.Schema({
	link : Number
});
const Link = new mongoose.model('Identity', linksSchema);
//uncomment link.save() after dropping the DB to initialise indentities collection

const link = Link({
	link : 1
});
// link.save();

//reply schema
const repliesSchema = new mongoose.Schema({
	linkID  : Number,
	replier : String,
	reply   : String,
	comDate : String,
	comTime : String
});
const Reply = new mongoose.model('Reply', repliesSchema);
//comments collection creation
const commentsSchema = new mongoose.Schema({
	linkID      : Number,
	commentator : String,
	comment     : String,
	reply       : Array,
	comDate     : String,
	comTime     : String
});
const Comment = new mongoose.model('Comment', commentsSchema);

//notes collection creation
const notesSchema = new mongoose.Schema({
	linkID        : Number,
	heading       : String,
	content       : String,
	date          : String,
	time          : String,
	thumbnailLink : String,
	about         : String,
	comments      : Array
});
const Note = new mongoose.model('Note', notesSchema);

//home
app.get('/', function(req, res) {
	Note.find({}, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			res.render('home', {
				array : doc
			});
		}
	});
});

//about
app.get('/about', function(req, res) {
	res.render('about', {
		content1 : aboutContent
	});
});

//contact
app.get('/contact', function(req, res) {
	res.render('contact', {
		content2 : contactContent
	});
});

//compose
app.get('/compose', function(req, res) {
	Link.find({}, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			res.render('compose');
		}
	});
});
app.post('/compose', function(req, res) {
	const composed = req.body.cmp;
	const heading = req.body.head;
	const thumb = req.body.thumb;
	const abt = req.body.abt;

	Link.find({}, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			const linkID = doc[0].link;
			const newNote = new Note({
				linkID        : linkID,
				heading       : heading,
				content       : composed,
				date          : date(),
				time          : time(),
				thumbnailLink : thumb,
				about         : abt
			});
			Link.findOneAndUpdate({ link: parseInt(linkID) }, { link: parseInt(linkID) + 1 }, function(err, doc) {
				if (err) {
					console.log(err);
				}
			});
			newNote.save(function(err) {
				if (err) {
					console.log(err);
				} else {
					res.redirect('/compose');
				}
			});
		}
	});
});
//:postID
app.get('/:postsID', function(req, res) {
	const postID = he.decode(req.params.postsID);
	if (postID === 'newsLetter') {
		res.render('page');
	} else {
		Note.findOne({ heading: postID }, function(err, doc) {
			if (err) {
				console.log(err);
			} else if (!doc) {
				res.render('post', {
					postHead    : 'Page not found',
					postContent : 'Go back to the home page!',
					imgL        : 'https://i.redd.it/t0rlgz5c1uf31.png'
				});
			} else {
				res.render('post', {
					postHead    : postID,
					postContent : doc.content,
					imgL        : doc.thumbnailLink,
					date        : doc.date,
					time        : doc.time,
					id          : doc._id,
					array       : doc.comments,
					objID       : doc._id,
					noteID      : doc.linkID
				});
			}
		});
	}
});

//delete
app.post('/delete', function(req, res) {
	const ID = req.body.ID;
	const comID = req.body.comID;
	const linkID = req.body.noteID;
	Note.findOneAndRemove({ _id: ID }, function(err, doc) {
		if (err) {
			console.log(err);
		} else {
			Comment.deleteMany({ linkID: linkID }, function(err) {
				if (err) {
					console.log(err);
				} else {
					Reply.deleteMany({ linkID: linkID }, function(err) {
						if (err) {
							console.log(err);
						} else {
							res.redirect('/');
						}
					});
				}
			});
		}
	});
});

//comments
app.post('/comments', function(req, res) {
	const postId = req.param.postsId;
	const noteID = req.body.noteID;
	let commentator = req.body.commentator;
	if (commentator === '') {
		commentator = 'Anonymous';
	}
	const comment = req.body.comment;
	const title = req.body.titleID;
	const comID = req.body.ID;
	const newComment = new Comment({
		linkID      : noteID,
		commentator : commentator,
		comment     : comment,
		comDate     : date(),
		comTime     : time()
	});
	newComment.save();
	Note.findOneAndUpdate({ _id: comID }, { $push: { comments: newComment } }, function(err, doc) {
		if (err) {
			console.log(err);
		} else if (!doc) {
			res.redirect('/' + title);
			alert('404 file not found');
		} else {
			res.redirect('/' + title);
		}
	});
});

//replies
app.post('/reply', function(req, res) {
	const title = req.body.title;
	const comID = req.body.replyBtn;
	const replier = req.body.replier;
	const reply = req.body.reply;
	const objID = req.body.objID;
	const commentID = req.body.commentID;
	const newReply = new Reply({
		linkID  : commentID,
		replier : replier,
		reply   : reply,
		comDate : date(),
		comTime : time()
	});
	newReply.save();
	Comment.findOneAndUpdate(
		{ _id: comID },
		{
			$push : { reply: newReply }
		},
		function(err, doc) {
			if (err) {
				console.log(err);
			} else if (!doc) {
				console.log('page not found 404');
				res.redirect('/' + title);
			}
		}
	);
	Comment.find({ linkID: commentID }, function(err, docu) {
		if (err) {
			console.log(err);
		} else if (!docu) {
			console.log('page not found 404');
			res.redirect('/' + title);
		} else {
			Note.findOneAndUpdate({ _id: objID }, { comments: docu }, function(err, docs) {
				if (err) {
					console.log(err);
				} else if (!docs) {
					console.log('page not found 404');
					res.redirect('/' + title);
				} else if (docs) {
					res.redirect('/' + title);
				}
			});
		}
	});
});
//Newsletter
app.post('/newsLetter', function(req, res) {
	const email = req.body.email;
	const Fname = req.body.Fname;
	const Lname = req.body.Lname;

	const data = {
		members : [
			{
				email_address : email,
				status        : 'subscribed',
				merge_fields  : {
					FNAME : Fname,
					LNAME : Lname
				}
			}
		]
	};
	const JSONdata = JSON.stringify(data);

	const url = 'https://us4.api.mailchimp.com/3.0/lists/5272ed54ff';
	const options = {
		method : 'POST',
		auth   : 'Anish1:e0feddbea6c937ed04fd83301a6dedec-us4'
	};

	const request = https.request(url, options, function(response) {
		if (response.statusCode === 200) {
			res.render('success', { name: Fname, title: 'Success!' });
		} else {
			res.render('fail', { name2: Fname, title: 'fail!' });
		}
	});
	request.write(JSONdata);
	request.end();
});
//listening
app.listen(process.env.PORT || 3000, function() {
	console.log('Server started on');
});
