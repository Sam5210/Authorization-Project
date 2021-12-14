//jshint esversion:6
require("dotenv").config();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema ({
    email: {type: String},
    password: {type: String},
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.route("/")
    .get(function(request, response){
        response.render("home");
    });

app.get("/secrets", function(request, response){
        if(request.isAuthenticated()){
            response.render("secrets");
        }
        else{
            response.redirect("/login");
        }
});

app.route("/register")
    .get(function(request, response){
        response.render("register");
    })
    .post(async function(request, response){
        User.register(
            {username: request.body.username}, 
            request.body.password,
            function(error, user){
                if(error){
                    console.log(error);
                    response.redirect("/register");
                }
                else{
                    passport.authenticate("local")(request, response, function(){
                        response.redirect("/secrets");
                    });
                }
            }
        );
    });

app.route("/login")
    .get(function(request, response){
        response.render("login");
    })
    .post(async function(request, response){
        
    });

app.listen(3000);