   //using nodemon to auto restart server
   //commandline: "npm run devstart" to run server on auto restart

   //USER API FORMAT:
   // users.id ; users.email ; users.hash ; users.type

   //INCLUDED PACKAGES
   //==================================================================
   var express = require("express"),
        bodyParser = require("body-parser"),
        bcrypt = require("bcrypt"),
        session = require('express-session'),
        passport = require("passport"),
        flash = require("express-flash");
    // require('dotenv').config()
    var LocalStrategy = require("passport-local").Strategy;         //Just need strategy from passport local
    var bcrypt = require("bcrypt");
    var request = require("request");                                     //used to hash/salt passwords and compare password hashes
    var app = express();

    // PASSPORT INITIALIZATION FUNCTION
    //  Authentication function 
    //  Take user email and password as params 
    //  Get user info from database using user entered email as key, 
    //  Compare user entered password with stored user password hash
    //=================================================================
    function initializePassport(passport, getUserByEmail, getUserById){
        var authenticateUser = async function(email, password, done){
                try{
                    var user = await getUserByEmail(email)                      //await is expecting a promise to be resolved in getUserByEmail
// /*DEBUG*/           console.log("||| DEBUG 2 (start auth) - this is the user", user.id, user.hash, user.email, user.type)
                    testUser(user, password, done)
                   } 
                catch(error){
                    return done(error, false, )                                          //some authentication error
                   }
        }
        passport.use(new LocalStrategy({ usernameField: 'userEmail', passwordField: "userPass"}, authenticateUser))
        passport.serializeUser(function(user, done){
              done(null, {id: user.id, type: user.type });                      //Store both ID and type
              })
              //saves the user.id in the session
        passport.deserializeUser(async (id, done) =>  {
             var getUser = await getUserById(id) 
             return done(null, getUser)    
        })  

    }
    //================================================================    
    function testUser( user, password, done){
            // console.log("password: ", password);
            // console.log("recieved pass: ", user.password);
            // console.log("bcrypt: ", bcrypt.compare(password, user.password))
                if(user==null){
                   //No matching email in DB to user's email
                //    console.log("user failed")
                   return done(null, false, { message: "No user with that email" })
                }
                bcrypt.compare(password, user.password).then(function(result){
                   if(result == true){
                    //     console.log("user passed")
                        //password correct, return authenticated user
                        return done(null, user)
                    }
                    else {
                    //password incorrect
                        // console.log("user failed")
                    }
                }    
        )}
    
    //CALLING PASSPORT INITIALIZATION
    //==================================================================    
    initializePassport(                                       //Params: passport, getUserByEmail(), getUserByID()
        passport, 
        //GET USER BY EMAIL (API CALL)
        function (email) { 
                console.log("Get user by email", email)                                          //Consider encrypting email
                return new Promise((resolve, reject) => {                   //PROMISE resolves to await in authenticateUser
                coreAPI = "https://kudosapi.wl.r.appspot.com/users/";       //USER OBJECT format should be:
                console.log(coreAPI + email)                                      //USER {id: "<number.", email: "<a@a.com>", hash: "<asdasd>", type: "admin/manager"}                    
                request(coreAPI + email, function (error, response, body) 
                {
                    if (error) 
                    {
                        console.log(error);
                        var user = null
                        resolve(user)
                    }
                    if (!error) 
                    {
                        // console.log ("|", body, "|");
                        if(body.trim() === "sql: no rows in result set")
                        {
                            body = null;
                            // console.log("Get user by email- no results found")
                        }
                        else{
                            // console.log("email matched")
                            var personObj = JSON.parse(body);
                        // console.log(personObj);
                        var user = {};
                        user.id= personObj.userid;
                        user.email = personObj.email;
                        user.password = personObj.password;
                        if(personObj.usertype === 1)
                        {user.type = "admin"}
                        else if(personObj.usertype === 2)
                        {user.type = "manager"}
                        else
                        {user.type = null}
                        user.createdby = personObj.createdby;
                        }
                        // console.log(user)
                        resolve(user);
                    }
                });
                
            }) //end of promise
        },
        //GET USER BY ID (API CALL)                                                    
        function (ID) { 
                                                                                                //Consider encrypting ID
                return new Promise((resolve, reject) => {                                           //PROMISE resolves to await in authenticateUser
                    coreAPI = "https://kudosapi.wl.r.appspot.com/users";      //USER OBJECT format should be:
                    //USER {id: "<number.", email: "<a@a.com>", hash: "<asdasd>", type: "admin/manager"}                    
                    request(coreAPI, function (error, response, body) 
                    {
                        if(!error){
                            // console.log("GET USER BY ID")
                            // console.log(body);  //get all users
                            var parsed = JSON.parse(body);
                            // console.log(parsed); //parse from JSON to JS object 
                            // console.log("ID: ", ID)
                            var personObj = parsed.find(x => x.userid === ID.id) //Find object of user who matches ID
                            // console.log("DEBUG",personObj,"DEBUG");
                            var user = {};  //import found user info to new object
                            user.id = personObj.userid;
                            user.email = personObj.email;
                            user.password = personObj.password;
                            if(personObj.usertype === 1)
                            {user.type = "admin"}
                            else if(personObj.usertype === 2)
                            {user.type = "manager"}
                            else
                            {user.type = null}
                            user.createdby = personObj.createdby;
                            // console.log(user)
                            resolve(user);
                            }
                        else{
                            console.log("ERROR- get user by Id")
                            var user = null
                            resolve(user);
                            }
                    });
            })//end of promise
        }
    );
        

    //OTHER PACKAGE SETUP
    //==================================================================
    app.set("view engine", "ejs");                          //establish ejs as template engine
    app.use(bodyParser.urlencoded({extended: true}));       //pull HTML-form vars into server.js; allow nested objects
    app.use(flash());                                       //express-flash is used by passport to return login error msgs to EJS template
    app.use(session({
        secret: "SuperSecretKudosKey",   //could also get from .env file holding environment vars use:"process.env.SESSION_SECRET"
        resave: false,                  //resave session vars even when nothing has changed = false
        saveUninitialized: false       //save an empty value if no actual value = false
    }))
    app.use(passport.initialize());
    app.use(passport.session());    //link passport to express sessions for persistant login
    app.use(express.static("public")); //use public folder to hold assets

    //COOKIE CHECK
    //==================================================================  
    function checkAuthenticated(req, res, next){
        if (req.isAuthenticated()){                 //Passport Auth function
//            console.log("|||DEBUG 7 - Auth check");
            return next()
        }
        else{
//            console.log("|||DEBUG 8 - Auth failed")
            res.redirect("/login");
        }
    }

    //CHECK USER TYPE
    //=================================================================
    function requireRole(role){
    return function (req, res, next) {
        if (req.user && req.user.type === role) {
//           console.log("|||DEBUG 5  - role check");
            next();
        } else {
            res.redirect("./login");
//            console.log("|||DEBUG 6 - Role Check Failure:", req.user, "    Role: ",role);
        }
      }
    }


// ROUTES
//=============================================== 

    // HOME REDIRECT
        app.get("/", function(req,res){
            res.redirect("/login")
        });

    // LOGIN PAGE   
        app.get("/login", function(req, res){
            res.render("login");
        });

        app.post("/login", passport.authenticate("local",{
            // console.log(req.body.userEmail); console.log(req.body.userPass);
            successRedirect: "/loginSuccess",
            failureRedirect: "/login",
            failureFlash: true      //displays flash message about failure type

        }));

    // LOGIN SUCCESS
        app.get("/loginSuccess", checkAuthenticated, function(req,res){
            if(req.user.type==="admin")
            {res.redirect("/admin")}
            else if(req.user.type==="manager")
            {res.redirect("/manager")}
            else
            {res.send("412 - Precoditions Failed")}
        });

    // CREATE PAGE   
        app.get("/create", function(req, res){
            res.render("create");
        });

        app.post("/create", async(req,res) => {
            // "accountType" is {"admin" or "manager"}
            // console.log(req.body.userEmail); console.log(req.body.userPass); console.log(req.body.accountType);
        
            try{
                var hashedPass = await bcrypt.hash(req.body.userPass, 10)       //Hash the user created password for safe storage (10 is Salt Val)
                // API CALL HERE TO CREATE ACCOUNT
                console.log(req.body)
                if(req.body.accountType === "manager")
                {
                        var data = {
                        firstname: req.body.userFirst,
                        lastname: req.body.userLast,
                        email: req.body.userEmail,
                        password: hashedPass,
                        createdby: 1
                        }
                        // console.log(data)
                        // var bodySub = JSON.stringify(data)
                        // console.log(formdata)

                        var options = { method: 'POST',
                          url: 'https://kudosapi.wl.r.appspot.com/users/managers',
                          headers: 
                           { 'cache-control': 'no-cache',
                             'content-type': 'application/x-www-form-urlencoded' },
                          form: false, 
                          body: JSON.stringify(data)  
                        };
                        
                        request(options, function (error, response, body) {
                          if (error) throw new Error(error);
                            
                        //   console.log("Body", body);
                        //   console.log("REsponse:", response)
                          res.redirect("/create")
                        });
                }
            } 
            catch(error) {
                res.redirect("/badrequest2")
            }
//            console.log(users);
            
        });

    // ADMIN PAGE   
        app.get("/admin", checkAuthenticated, requireRole("admin"), function(req, res){
            res.render("admin.ejs");
        });

    // MANAGER PAGE
        app.get("/manager", checkAuthenticated, requireRole("manager"), function(req, res){
            tempData = [
                {id: "ID1",
                 timestamp: {time: "01-01-01"},
                 region: "Region 1",
                 type: "Most Productive",
                 recipientname: "Morgan Freeman"
                },
                {id: "ID2",
                 timestamp: {time: "02-02-02"},
                 region: "Region 2",
                 type: "Least Productive",
                 recipientname: "Willis Freeman"
                },
                {id: "ID3",
                 timestamp: {time: "03-03-03"},
                 region: "Region 3",
                 type: "Middlist Productive",
                 recipientname: "Sarah Freeman"
                }
            ]
            res.render("manager.ejs",{awardData: tempData});
        });

    //OTHER - gets user by ID
        app.get("/other", function(req,res){
            request("https://kudosapi.wl.r.appspot.com/users/bf@g.com", function(error, responce, body){
                if(!error){
                    console.log(body)
                    var parsed = JSON.parse(body)
                    console.log(parsed);
                    res.redirect("/badrequest");
                }
                else{
                    console.log("ERROR- get user by Id")
                    res.render("/badrequest");
                }
            });
        })    
    //LOGOUT
        app.get("/logout", function(req,res){
            req.logout();
            res.redirect("/login")
        });



    // 404    
        app.get("/*", function(req,res){
            res.send("Request not Found! 404 Bro")
        });


//================LISTEN===============================
    const PORT = process.env.PORT || 31112;
    app.listen(PORT, function(){
        console.log("Server started on port", PORT)
    });