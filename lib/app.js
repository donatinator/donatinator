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
const env = require('./env.js')
const middleware = require('./middleware.js')
const settings = require('./settings.js')
const api = require('./api.js')
const utils = require('./utils.js')
const db = require('./db.js')

// --------------------------------------------------------------------------------------------------------------------
// setup

const publicDir = path.join(__dirname, '..', 'public')

const stripeClient = stripe(env.stripeSecretKey)

const isProd = env.nodeEnv === "production"  || env.nodeEnv === "staging"
const isDev  = env.nodeEnv === "development" || env.nodeEnv === "testing"

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
  title           : 'Your Name Here',
  min             : isProd ? ".min" : "",
  stripePublicKey : env.stripePublicKey,
}

// npm middleware for all routes
if ( env.apex ) {
  app.use(canonicalHost(env.apex, 302))
}
app.use(favicon(path.join(publicDir, 'favicon.ico')))
app.use(morgan(isProd ? "common" : "dev"))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(compression())
app.use(express.static(publicDir))
app.use(cookieSession({
  name   : 'session',
  keys   : [ env.sessionKey ],
  maxAge : 24 * 60 * 60 * 1000 // 24 hours
}))

// local middleware for all routes
app.use(middleware.context)
app.use(middleware.rid)
app.use(middleware.redirect({
  '/admin' : '/admin/',
}))
app.use(middleware.loadSettings)

// --- routes ---

app.get('/', (req, res) => {
  console.log('%s : /', req._.rid)
  res.render('index', {
    toptab          : 'index',
    stripePublicKey : env.stripePublicKey,
  })
})

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(publicDir, 'robots.txt'))
})

app.get('/about', (req, res) => {
  res.render('about', {
    toptab : 'about',
  })
})

app.get('/contact', (req, res) => {
  res.render('contact', {
    toptab : 'contact',
  })
})

app.get('/thanks', (req, res) => {
  res.render('thanks')
})

// Single Donation.
app.post('/donate', (req, res, next) => {
  console.log('%s : /donate', req._.rid)

  // We need to do three things:
  //
  // 1. Send the `stripeToken` back to Stripe to actually charge the card.
  // 2. Send a thank you email to the user.
  // 3. Render the "Thank You" page for the user to see payment was successful.

  // validate a few of the things we've been given
  const token_id  = req.body.token_id
  const type      = req.body.type
  const amount    = req.body.amount
  const email     = req.body.email
  const client_ip = req.body.client_ip

  // validation will occur when we hit Stripe with the token and the inputs from the form

  // From : https://stripe.com/docs/api#create_charge
  const chargeInfo = {
    amount        : amount,
    currency      : res.locals.settings.currency,
    source        : token_id,
    // ToDo : need to config the name here from the datastore.
    description   : 'Single $' + ('' + (amount|0)/100) + ".00 Donation to '" + res.locals.settings.title + "'",
    receipt_email : email,
    // ToDo : config this up (max 22 chars)
    // the text to show on the user's Credit Card statement (up to 22 chars)
    statement_descriptor : 'FRESH WATER DONATION',
  }

  const charge = stripeClient.charges.create(chargeInfo, (err, charge) => {
    if (err) {
      // ToDo: if we had an error, we should store the error somewhere so we can see it - let's say the 'event' table.
      return next(err)
    }

    // look into `charge.outcome` for what actually happened. Show the user the `seller_message`.

    var singleCharge = {
      // from the `token` (ie. from `req.body` from the browser)
      type           : type,
      token_id       : token_id,
      client_ip      : client_ip,

      // from the charge
      charge_id      : charge.id,
      transaction_id : charge.balance_transaction,
      email          : charge.receipt_email,
      currency       : charge.currency,
      amount         : charge.amount,
      status         : charge.status,
      livemode       : charge.livemode,

      // fields we've generated/added
      ip             : utils.getIp(req),
    }
    api.insSingleCharge(singleCharge, (err, res) => {
      // Note: this callback outlasts the request lifetime

      // if there was an error, put it into the `event` table
      if ( err ) {
        // ToDo: ... !!!
        console.warn('Error inserting a single charge:', err)
      }
    })

    res.redirect(302, '/thanks')
  })
})

app.get('/sign-in', middleware.ensureNoUser, (req, res) => {
  res.render('sign-in', {
    form     : {},
    errors   : {},
  })
})

// Note: we don't send the entire `req.body` as the form to the template. Even though the template only uses
// `req.body.username` and not `req.body.password`, we just want to make sure that that can never accidentally happen.
// Hence, since we only need one field, let's just be explicit and send only that to the template renderer.
app.post('/sign-in', middleware.ensureNoUser, (req, res) => {
  const username = req.body.username
  const password = req.body.password

  // firstly, make sure the username is as expected
  if ( username !== env.username ) {
    res.render('sign-in', {
      msg      : 'Error signing in',
      form     : {
        username : username,
      },
      errors   : {
        username : 'Unknown username',
      },
    })
    return
  }

  // check the password is correct
  bcrypt.compare(password, env.password, (err, ok) => {
    if (err) return next(err)

    // if the password is incorrect, just re-render the sign-in form (with the username again)
    if ( !ok ) {
      res.render('sign-in', {
        msg      : 'Error signing in',
        form     : {
          username : username,
        },
        errors   : {
          password : 'Incorrect password',
        },
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

app.get('/admin/settings', (req, res, next) => {
  // get all the current settings
  api.selSettings((err, current) => {
    if (err) return next(err)

    res.render('admin-settings', {
      cfg     : settings.items,
      current : current,
      form    : {},
      errors  : {},
    })
  })
})

app.get('/admin/donations', (req, res, next) => {
  // get all the donations
  api.selSingleDonationsAll((err, donations) => {
    if (err) return next(err)

    res.render('admin-donations', {
      donations : donations,
    })
  })
})

app.post('/admin/settings', (req, res, next) => {
  // get the form and normalise the inputs (plus remove any field we don't know)
  let form = settings.normalise(req.body)

  // now validate the normalised values
  let errors = settings.validate(form)

  if ( errors ) {
    // re-render the form with errors
    api.selSettings((err, current) => {
      if (err) return next(err)

      res.render('admin-settings', {
        cfg     : settings.items,
        current : current,
        form    : form,
        errors  : errors,
      })
    })
    return
  }

  console.log('Saving settings')

  // save these settings from the normalised form
  api.saveSettings(form, (err) => {
    if (err) return next(err)

    // call the reloadSettings middleware explicitly
    middleware.reloadSettings(req, res, (err) => {
      if (err) return next(err)
      res.redirect('/admin/')
    })
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
