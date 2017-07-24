// --------------------------------------------------------------------------------------------------------------------

"use strict"

// core
const path = require('path')

// npm
const express = require('express')
const favicon = require('serve-favicon')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const compression = require('compression')
const cookieSession = require('cookie-session')
const canonicalHost = require('canonical-host')
const stripe = require("stripe")
const bcrypt = require("bcrypt")

// local
const middleware = require('./middleware.js')
const settings = require('./settings.js')

// --------------------------------------------------------------------------------------------------------------------
// setup

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY)

const isProd = process.env.NODE_ENV === "production"  || process.env.NODE_ENV === "staging"
const isDev  = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "testing"

// --------------------------------------------------------------------------------------------------------------------
// application

const app = express()

app.set('views', path.join(__dirname, '..', 'views'))
app.set('view engine', 'pug')
app.enable('trust proxy')
app.enable('strict routing')
app.set('case sensitive routing', true)
app.disable('x-powered-by')

app.locals = {
  title           : process.env.TITLE    || 'Your Name Here',
  min             : isProd ? ".min" : "",
  apex            : process.env.APEX     || 'example.com',
  baseUrl         : process.env.BASE_URL || 'http://example.com',
  stripePublicKey : process.env.STRIPE_PUBLIC_KEY,
}

// npm middleware for all routes
app.use(canonicalHost(process.env.APEX, 302))
app.use(favicon(path.join(__dirname, '..', 'public', 'favicon.ico')))
app.use(morgan(isProd ? "common" : "dev"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(compression())
app.use(express.static(path.join(__dirname, '..', 'public')))
app.use(cookieSession({
  name   : 'session',
  keys   : [ process.env.SESSION_KEY ],
  maxAge : 24 * 60 * 60 * 1000 // 24 hours
}))

// local middleware for all routes
app.use(middleware.context)
app.use(middleware.rid)
app.use(middleware.log)
app.use(middleware.redirect({
  '/admin' : '/admin/',
}))

app.get('/', (req, res) => {
  req._.log.info('/')
  res.render('index', {
    toptab : 'index',
  })
})

app.get('/about', (req, res) => {
  req._.log.info('/about')
  res.render('about', {
    toptab : 'about',
  })
})

app.get('/contact', (req, res) => {
  req._.log.info('/contact')
  res.render('contact', {
    toptab : 'contact',
  })
})

app.get('/thanks', (req, res) => {
  res.render('thanks')
})

// Single Donation.
app.post('/donate', (req, res, next) => {
  req._.log.info('/donate - ', req.body)

  // In here:
  // 0. `req.method` is "POST"
  // 1. `req.params` is `{}`
  // 2. `req.query`  is `{}`
  // 3. `req.body`   is `{ stripeToken: 'tok_...', stripeTokenType: 'card', stripeEmail: 'donator@example.com' }`

  // We need to do three things:
  //
  // 1. Send the `stripeToken` back to Stripe to actually charge the card.
  // 2. Send a thank you email to the user.
  // 3. Render the "Thank You" page for the user to see payment was successful.

  // validate a few of the things we've been given
  const email     = req.body.email
  const token     = req.body.token
  const tokenType = req.body.tokenType // not used
  const amount    = req.body.amount

  // ToDo : validation
  //
  // * Check the 'amount' is an integer

  // ToDo: save this transaction to the datastore ... and perhaps the returned info from Stripe too.
  // From : https://stripe.com/docs/api#create_charge
  const chargeInfo = {
    amount        : amount,
    currency      : "nzd",
    source        : token,
    // ToDo : need to config the name here from the datastore.
    description   : 'Single $' + ('' + (amount|0)/100) + ".00 Donation to 'Fresh Water for All'",
    receipt_email : email,
    // ToDo : config this up (max 22 chars)
    // the text to show on the user's Credit Card statement (up to 22 chars)
    statement_descriptor : 'FRESH WATER DONATION',
  }

  const charge = stripeClient.charges.create(chargeInfo, (err, charge) => {
    if (err) return next(err)

    // see what is in the charge
    console.log('charge:', charge)

    // NOTE: we can pretty much store anything we want
    //
    // * https://stripe.com/docs/security#out-of-scope-card-data
    //
    // Some things we might want to put into the datastore. e.g. 'id' means 'charge.id'.
    //
    // * id       - the charge ID (starting with "ch_...")
    // * amount   - e.g. 1000, 2500, or 10000
    // * created  - the timestamp on the Stripe servers
    // * currency - should always be the one set, but I guess that can change over time
    // * status   - should always be "succeeded" but I guess it could be something different in failure modes
    // * source.name        - the email of the person entering their card
    // * source.address_zip - the zip of the person entering their card

    // look into `charge.outcome` for what actually happened. Show the user the `seller_message`.

    res.redirect(302, '/thanks')
  })
})

app.get('/sign-in', middleware.ensureNoUser, (req, res) => {
  res.render('sign-in', {
    username : '',
  })
})

app.post('/sign-in', middleware.ensureNoUser, (req, res) => {
  const username = req.body.username
  const password = req.body.password

  // firstly, make sure the username is as expected
  if ( username !== process.env.USERNAME ) {
    res.render('sign-in', {
      msg      : 'Incorrect username',
      username : username,
    })
    return
  }

  // check the password is correct
  bcrypt.compare(password, process.env.PASSWORD, (err, ok) => {
    if (err) return next(err)

    // if the password is incorrect, just re-render the sign-in form (with the username again)
    if ( !ok ) {
      res.render('sign-in', {
        msg      : 'Incorrect password',
        username : username,
      })
      return
    }

    // looks like the user signed in ok
    req.session.user = {
      username : username,
    }
    res.redirect(302, '/admin/')
  })
})

app.get('/sign-out', (req, res) => {
  if ( req.user ) {
    return res.redirect(302, '/admin/')
  }

  // destroy the session
  req.session = null

  // redirect back to homepage
  return res.redirect(302, '/')
})

app.use('/admin', middleware.ensureUser, middleware.setTitle('Admin'))

app.get('/admin/', (req, res) => {
  res.render('admin-index')
})

app.get('/admin/settings', (req, res) => {
  // ToDo: get the current values from the database
  let values = {
    currency    : 'nzd',
    splashImage : 'https://s3.postimg.org/qa57kzblf/pexels-photo-117403.jpg',
  }
  res.render('admin-settings', {
    settings : settings,
    values   : values,
  })
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = isDev ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

// --------------------------------------------------------------------------------------------------------------------

module.exports = app

// --------------------------------------------------------------------------------------------------------------------
