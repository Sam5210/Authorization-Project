//jshint esversion:6
require("dotenv").config();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const express = require("express");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema ({
    email: {type: String, required: [true, "No email specified"]},
    password: {type: String, required: [true, "No password specified"]},
});

userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);

app.route("/")
    .get(function(request, response){
        response.render("home");
    });

app.route("/register")
    .get(function(request, response){
        response.render("register");
    })
    .post(async function(request, response){
        let user = new User ({
            email: request.body.username,
            password: request.body.password,
        });
        await user.save(function(error){
            if(error){response.send(error);}
            else{response.render("secrets");}
        })
    });

app.route("/login")
    .get(function(request, response){
        response.render("login");
    })
    .post(async function(request, response){
        User.findOne(
        {
            email: request.body.username,
            password: request.body.password,
        }, function(error, user){
            if(error){response.send(error);}
            else{
                if(user){
                    response.render("secrets");
                }
                else{
                    response.send("<h1>Cannot find user with corresponding\
                        username and password.</h1>");
                    }
            }
        });
    });

app.listen(3000);