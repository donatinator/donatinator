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
const bcrypt = require("bcrypt")
const MarkdownIt = require('markdown-it')

// local
const env = require('./env.js')
const middleware = require('./middleware.js')
const stripeMiddleware = require('./middleware/stripe.js')
const settings = require('./settings.js')
const api = require('./api.js')
const utils = require('./utils.js')
const db = require('./db.js')
const validate = require('./validate.js')
const stripe = require('./stripe.js')
const valid = require('./valid.js')

// --------------------------------------------------------------------------------------------------------------------
// setup

const publicDir = path.join(__dirname, '..', 'public')

const isProd = env.nodeEnv === "production"  || env.nodeEnv === "staging"
const isDev  = env.nodeEnv === "development" || env.nodeEnv === "testing"

// create a Markdown processor
const md = new MarkdownIt()

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

app.get(
  '/',
  middleware.loadGifts,
  stripeMiddleware.loadPlans,
  (req, res) => {
    console.log('%s : /', req._.rid)

    // get the markdown from the database
    api.getPage('index', (err, page) => {
      if (err) {
        // we might have an error with the database, but we can still show the index page
        console.warn(err)
      }

      res.render('index', {
        toptab          : 'index',
        stripePublicKey : env.stripePublicKey,
        page            : page,
      })
    })
  }
)

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(publicDir, 'robots.txt'))
})

// check the `/thanks` page before landing on the generic `/:name` route
app.get('/thanks', (req, res, next) => {
  api.getPage('thanks', (err, page) => {
    if (err) {
      console.warn(err)
      // we might have an error with the database, but we can still show a thanks page
      page = {
        title : 'Thanks',
        html  : '<p>Thank you for your donation.</p>',
      }
    }

    // or if we couldn't get the page for some reason
    if ( !page ) {
      page = {
        title : 'Thanks',
        html  : '<p>Thank you for your donation.</p>',
      }
    }

    res.render('page', {
      toptab : page.name,
      page   : page,
    })
  })
})

// Donation
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

  // Whilst some validation will occur when we hit Stripe with the token and the inputs from the form it also says here
  // (https://stripe.com/docs/recipes/subscription-signup) that we should validate these things ourself (search for
  // "Note that in the interest of keeping this example simple ..."). However, what should we validate? The email?
  // The token? i.e. matching /^tok_[A-Za-z0-9]{24}$/.
  //
  // ToDo: We should definitely check the amount!

  // From : https://stripe.com/docs/api#create_charge
  const chargeInfo = {
    amount        : amount,
    currency      : res.locals.settings.currency,
    source        : token_id,
    // ToDo : need to config the name here from the datastore.
    description   : '$' + ('' + (amount|0)/100) + ".00 Donation to '" + res.locals.settings.title + "'",
    receipt_email : email,
    // ToDo : config this up (max 22 chars)
    // the text to show on the user's Credit Card statement (up to 22 chars)
    statement_descriptor : 'FRESH WATER DONATION',
  }

  const charge = stripe.charges.create(chargeInfo, (err, charge) => {
    if (err) {
      // ToDo: if we had an error, we should store the error somewhere so we can see it - let's say the 'event' table.
      return next(err)
    }

    // look into `charge.outcome` for what actually happened. Show the user the `seller_message`.

    var donation = {
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
    api.insDonation(donation, (err, res) => {
      // Note: this callback outlasts the request lifetime

      // if there was an error, put it into the `event` table
      if ( err ) {
        // ToDo: ... !!!
        console.warn('Error inserting a donation:', err)
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
  api.selDonationsAll((err, donations) => {
    if (err) return next(err)

    res.render('admin-donations', {
      donations : donations,
    })
  })
})

// --- Pages ---

app.get('/admin/pages', (req, res, next) => {
  // get all the pages
  api.selPagesAll((err, pages) => {
    if (err) return next(err)

    res.render('admin-pages', {
      pages : pages,
    })
  })
})

app.get('/admin/page/new', (req, res, next) => {
  res.render('admin-page-form', {
    page   : {}, // start with nothing
    form   : {}, // nothing so far
    errors : {}, // no errors yet!
  })
})

app.post('/admin/page/new', (req, res, next) => {
  const { errs, data } = validate.page.new(req.body)

  // if errors, re-render the form
  if ( errs ) {
    return res.render('admin-page-form', {
      page   : {},
      form   : req.body,
      errors : errs,
    })
  }

  // set the html
  data.html = md.render(data.content)

  // insert this page into the database
  api.insPage(data, (err) => {
    if (err) return next(err)

    // all good
    res.redirect('/admin/pages')
  })
})

app.get('/admin/page/:name', (req, res, next) => {
  // get the page
  const name = req.params.name
  if ( name === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this page
  api.getPage(name, (err, page) => {
    if (err) return next(err)

    if ( !page ) {
      return res.status(404).send("404 - Not Found")
    }

    res.render('admin-page-:name', {
      page : page,
    })
  })
})

app.get('/admin/page/:name/edit', (req, res, next) => {
  const name = req.params.name
  if ( name === '' ) {
    return res.status(404).send("404 - Unknown page name")
  }

  // get just this page
  api.getPage(name, (err, page) => {
    if (err) return next(err)

    console.log('err:', err)
    console.log('page:', page)

    res.render('admin-page-form', {
      page   : page,
      form   : page,
      errors : {},
    })
  })
})

app.post('/admin/page/:name/edit', (req, res, next) => {
  const name = req.params.name
  if ( name === '' ) {
    return res.status(404).send("404 - Unknown page name")
  }

  // get the page
  let form = req.body
  const { errs, data } = validate.page.edit(form)

  // firstly, check that this name currently exist in the database
  api.getPage(name, (err, page) => {
    if (err) return next(err)

    if ( !page ) {
      return res.status(404).send("404 - Unknown page name")
    }

    // If there were errors with validation, re-render the form (had to wait until now so that we could pass the 'page'
    // back to the template.
    if ( errs ) {
      return res.render('admin-page-form', {
        page   : page,
        form   : form,
        errors : errs,
      })
    }

    // update this page
    data.id   = page.id
    data.html = md.render(data.content)
    console.log('data:', data)

    // update the page and redirect to pages
    api.updPage(data, (err) => {
      if (err) return next(err)

      console.log('err:', err)

      res.redirect('/admin/pages')
    })
  })
})

// --- Gifts ---

app.get(
  '/admin/gifts',
  middleware.reloadGifts,
  (req, res, next) => {
    res.render('admin-gifts')
  }
)

app.get('/admin/gift/new', (req, res, next) => {
  res.render('admin-gift-form', {
    gift      : {}, // start with nothing
    form      : {}, // nothing so far
    errors    : {}, // no errors yet!
  })
})

app.post('/admin/gift/new', (req, res, next) => {
  // validate the incoming params
  const { errs, data } = validate.gift.new(req.body)

  // If there were errors with validation, re-render the form.
  if ( errs ) {
    // re-render the form
    res.render('admin-gift-form', {
      gift      : {},
      form      : req.body,
      errors    : errs,
    })
    return
  }

  console.log('errs:', errs)
  console.log('data:', data)

  // insert this gift into the database
  // const gift = {
  //   id          : data.id,
  //   name        : data.name,
  //   description : data.description,
  //   amount      : data.amount,
  //   currency    : res.locals.settings.currency,
  //   currency    : res.locals.settings.currency,
  // }
  api.insGift(data, (err) => {
    if (err) return next(err)

    // all good
    res.redirect('/admin/gifts')
  })
})

app.get('/admin/gift/:id', (req, res, next) => {
  // get the gift
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this gift
  api.getGift(id, (err, gift) => {
    if (err) return next(err)

    if ( !gift ) {
      return res.status(404).send("404 - Not Found")
    }

    res.render('admin-gift-:name', {
      gift : gift,
    })
  })
})

app.get('/admin/gift/:name/edt', (req, res, next) => {
  // get the gift
  const name = req.params.name
  if ( name === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this gift
  api.getGift(name, (err, gift) => {
    if (err) return next(err)

    if ( !gift ) {
      return res.status(404).send("404 - Not Found")
    }

    // now get all the intervals
    res.render('admin-gift-form', {
      form      : gift,
      errors    : {}, // no errors yet!
      intervals : valid.intervals,
    })
  })
})

// --- Plans ---

app.get(
  '/admin/plans',
  stripeMiddleware.reloadPlans,
  (req, res, next) => {
    res.render('admin-plans')
  }
)

app.get('/admin/plan/new', (req, res, next) => {
  res.render('admin-plan-form', {
    plan      : {}, // start with nothing
    form      : {}, // nothing so far
    errors    : {}, // no errors yet!
    intervals : valid.intervals,
  })
})

app.post('/admin/plan/new', (req, res, next) => {
  // validate the incoming params
  const { errs, data } = validate.plan.new(req.body)

  // If there were errors with validation, re-render the form.
  if ( errs ) {
    // re-render the form
    res.render('admin-plan-form', {
      plan      : {},
      form      : req.body,
      errors    : errs,
      intervals : valid.intervals,
    })
    return
  }

  console.log('errs:', errs)
  console.log('data:', data)

  console.log('This is a recurring plan, so we need to send to Stripe')

  // before adding to our database, firstly add it to Stripe
  const stripePlan = {
    id                   : data.name,
    name                 : data.title,
    currency             : res.locals.settings.currency,
    amount               : data.amount,
    interval             : data.interval,
    interval_count       : 1, // always 1 (for now, might change in the future)
    statement_descriptor : data.statement,
    metadata             : {
      active      : 'yes', // metadata can only contain strings
      description : data.description,
    },
  }
  stripe.plans.create(stripePlan, (err, plan) => {
    // asynchronously called
    console.log('stripe.plans.create - err:', err)
    console.log('stripe.plans.create - plan:', plan)
    if (err) return next(err)

    // all good
    res.redirect('/admin/plans')
  })
})

app.get('/admin/plan/:name', (req, res, next) => {
  // get the plan
  const name = req.params.name
  if ( name === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this plan
  api.getPlan(name, (err, plan) => {
    if (err) return next(err)

    if ( !plan ) {
      return res.status(404).send("404 - Not Found")
    }

    res.render('admin-plan-:name', {
      plan : plan,
    })
  })
})

app.get('/admin/plan/:name/edt', (req, res, next) => {
  // get the plan
  const name = req.params.name
  if ( name === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this plan
  api.getPlan(name, (err, plan) => {
    if (err) return next(err)

    if ( !plan ) {
      return res.status(404).send("404 - Not Found")
    }

    // now get all the intervals
    res.render('admin-plan-form', {
      form      : plan,
      errors    : {}, // no errors yet!
      intervals : valid.intervals,
    })
  })
})

// --- Settings ---

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

// generic pages
app.get('/:name', (req, res, next) => {
  api.getPage(req.params.name, (err, page) => {
    if (err) return next(err)

    if ( !page ) {
      return res.status(404).send("404 - Not Found")
    }

    res.render('page', {
      toptab : page.name,
      page   : page,
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
