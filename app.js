const express = require('express');
const app = express();
const path=require('path');
// const crypto=require('crypto');
// const multer =require('multer');
const multerconfig=require('./config/multerConfig')
const session = require("express-session");
const flash = require("connect-flash");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bcrypt = require('bcrypt');
const userModel = require("./models/user");
const postModel = require("./models/post");
const upload = require('./config/multerConfig');
const { profile } = require('console');
app.use(express.static(path.join(__dirname,"public")));
app.use(cookieParser());
app.use(session({
  secret: "shhh",
  resave: false,
  saveUninitialized: false
}));

app.use(flash());
 
app.get('/profile/upload',(req,res)=>{
  res.render("profileUpload");
});
app.post('/upload',isLoggedin,multerconfig.single('image'),async (req,res)=>{
// console.log(upload);
let user=await userModel.findOne({email: req.user.email})
user.profilepic=req.file.filename
await user.save();
res.redirect('/profile');

});

// Middleware setup

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes

app.get('/',upload.single('image'), (req, res) => {
  res.render("index");
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/logout', (req, res) => {
  res.clearCookie("token");
  req.flash("success", "You have been logged out.");
  res.redirect('/login');
});

app.post('/register',upload.single('image'), async (req, res) => {
  const { name, username, email, age, password } = req.body;
  const file=req.file;
  let user = await userModel.findOne({ email });

  if (user) {
    req.flash("error", "User already registered with this email.");
    return res.redirect('/');
  }

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let newUser = await userModel.create({
        name,
        username,
        email,
        age,
        password: hash,
        profilepic: file.filename
      });
      let token = jwt.sign({ email, userid: newUser._id }, "shhh");
      res.cookie("token", token);
      req.flash("success", "Account created successfully!");
      res.redirect('/profile');
    });
  });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  let user = await userModel.findOne({ email });

  if (!user) {
    req.flash("error", "No user found with that email.");
    return res.redirect('/login');
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email, userid: user._id }, "shhh");
      res.cookie("token", token);
      req.flash("success", "Logged in successfully.");
      res.redirect('/profile');
    } else {
      req.flash("error", "Incorrect password.");
      res.redirect('/login');
    }
  });
});

// Auth middleware
function isLoggedin(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    req.flash("error", "You must be logged in to access this page.");
    return res.redirect('/login');
  }

  try {
    const data = jwt.verify(token, "shhh");
    req.user = data;
    next();
  } catch (err) {
    return res.status(401).send("Invalid token");
  }
}

app.get('/profile', isLoggedin, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email }).populate("posts");
  res.render('profile', { user });
});

app.get('/like/:postid', isLoggedin, async (req, res) => {
  let post = await postModel.findById(req.params.postid);

  if (!post) {
    req.flash("error", "Post not found.");
    return res.redirect('/profile');
  }

  const userId = req.user.userid;
  if (!post.likes.includes(userId)) {
    post.likes.push(userId);
  } else {
    post.likes.pull(userId);
  }

  await post.save();
  res.redirect("/profile");
});

app.get('/edit/:postid', isLoggedin, async (req, res) => {
  let post = await postModel.findById(req.params.postid);
  if (!post) {
    req.flash("error", "Post not found.");
    return res.redirect('/profile');
  }
  res.render("edit", { post, user: req.user });
});

app.post('/update/:postid', isLoggedin, async (req, res) => {
  let post = await postModel.findOneAndUpdate(
    { _id: req.params.postid },
    { content: req.body.content },
    { new: true }
  );
  await post.save();
  req.flash("success", "Post updated successfully.");
  res.redirect('/profile');
});

app.post('/post', isLoggedin, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  const { content } = req.body;

  let post = await postModel.create({
    user: user._id,
    content
  });

  user.posts.push(post._id);
  await user.save();
  req.flash("success", "Post created successfully.");
  res.redirect("/profile");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
