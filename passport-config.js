var LocalStrategy = require("passport-local").Strategy;         //Just need strategy from passport local
var bcrypt = require("bcrypt");


function initialize(passport, getUserByEmail, getUserById){

    //Authentication function
    var authenticateUser = async function(email, password, done){
            var user = getUserByEmail(email)
            console.log(user);
            if(user==null){
                //No matching email
                return done(null, false, { message: "No user with that email" })
                }
            try{
                if(await bcrypt.compare(password, user.password)){
                    //password correct, return authenticated user
                    return done(null, user)
                } else {
                    //password incorrect
                    return done(null, false, { message: "Password is incorrect" })
                }
            } catch (error) {
                //some authentication error
                return done(error)

            }
    }


    passport.use(new LocalStrategy({ usernameField: 'userEmail', passwordField: "userPass"}, authenticateUser))
    
    passport.serializeUser((user, done) =>  done(null, user.id)    )
    passport.deserializeUser((id, done) =>  {
        return done(null, getUserById(id))   })

}

module.exports = initialize