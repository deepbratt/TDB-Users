const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel');

//) 2nd Step
passport.serializeUser((user, done) => {
  done(null, user.id);
});

//) 3rd Step
// id coming from serializeUser ==> user.id
passport.deserializeUser((req, id, done) => {
  User.findById(req.id).then((user) => {
    done(null, user);
  });
});

//) 1st Step
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3004/v1/users/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      const newUser = {
        googleId: profile.id,
        displayName: profile.displayName,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        // image: profile.photos[0].value,
        email: profile.emails[0].value,
      };
      try {
        //find the user in our database
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          //If user present in our database.
          done(null, user);
        } else {
          // if user is not preset in our database save user data to database.
          user = await User.create(newUser);
          done(null, user);
        }
      } catch (err) {
        console.error(err);
      }
    },
  ),
);
