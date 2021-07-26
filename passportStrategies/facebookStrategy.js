const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../model/userModel');

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (req, id, done) {
  User.findById(req.id).then((user) => {
    done(null, user);
  });
});

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_OAUTH_LINK,
      profileFields: [
        'id',
        'displayName',
        'name',
        'gender',
        'picture.type(large)',
        'email',
      ],
    },
    async (accessToken, refreshToken, profile, done) => {
      // console.log(profile);
      const newUser = {
        facebookId: profile.id,
        displayName: profile.displayName,
        firstName: profile.name.givenName,
        middleName: profile.name.middleName,
        lastName: profile.name.familyName,
        image: profile.photos[0].value,
        email: profile.emails[0].value,
      };
      try {
        //find the user in our database
        let user = await User.findOne({ facebookId: profile.id });

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
