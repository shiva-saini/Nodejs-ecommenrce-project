const bcrypt = require("bcryptjs");
const nodemailer = require("nodeMailer");
const crypto = require("crypto");
const User = require("../models/user");
const { validationResult } = require("express-validator");
// const { ValidationError } = require("sequelize/types");

exports.getLogin = (req, res, next) => {
  // let message = req.flash('error');
  // let ermessage = null;
  // // console.log(message);
  // if(message.lentgh > 0){
  //   ermessage = message[0];
  // 'mrraghav9412@gmail.com'
  // }else{
  //   ermessage = null;
  // }

  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: req.flash("error"),
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: req.flash("error"),
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "login",
      errorMessage: errors.array()[0].msg,
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash(
          "error",
          "Invalid email or password,please enter valid credentials"
        );
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          req.flash("error", "Invalid email or password.");
          res.redirect("/login");
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // console.log(errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: req.body.confirmPassword,
      },
    });
  }

  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      const msg = {
        from: "shivasainisiyana2211@gmail.com",
        to: email,
        subject: "testing mail",
        text: "testing mail sent from my side(shiva saini)",
      };

      return nodemailer
        .createTransport({
          service: "gmail",
          auth: {
            user: "shivasainisiyana2211@gmail.com",
            pass: "suzhzogpgjzykvsg",
          },
          port: 465,
          host: "smtp.gmail.com",
        })
        .sendMail(msg, (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log("sent");
          }
        });
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    isAuthenticated: false,
    errorMessage: req.flash("error"),
  });
};

exports.postReset = (req, res, next) => {
  crypto.pseudoRandomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "Sorry , user with this email does not exist.");
          return res.redirect("/reset");
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        res.redirect("/");
        const msg = {
          from: "shivasainisiyana2211@gmail.com",
          to: req.body.email,
          subject: "Password reset",
          html: `
                 <p> You requested a password reset</p>
                 <p> Click this <a href="http://localhost:3000/reset/${token}">Link</a> 
                  to set a new password</p>
                `,
        };

        return nodemailer
          .createTransport({
            service: "gmail",
            auth: {
              user: "shivasainisiyana2211@gmail.com",
              pass: "suzhzogpgjzykvsg",
            },
            port: 465,
            host: "smtp.gmail.com",
          })
          .sendMail(msg, (err) => {
            if (err) {
              console.log(err);
            } else {
              console.log("sent");
            }
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => console.log(err));
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        isAuthenticated: false,
        errorMessage: req.flash("error"),
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => console.log(err));
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => console.log(err));
};