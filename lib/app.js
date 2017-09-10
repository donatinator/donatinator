// --------------------------------------------------------------------------------------------------------------------
//
//  The Donatinator - A secure way to accept Single/Recurring Donations.
//  Copyright (C) 2017 Andrew Chilton <andychilton@gmail.com> (https://chilts.org)
//
// --------------------------------------------------------------------------------------------------------------------
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU Affero General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
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
const RateLimit = require('express-rate-limit')

// local
const env = require('./env.js')
const middleware = require('./middleware.js')
const stripeMiddleware = require('./middleware/stripe.js')
const settings = require('./settings.js')
const api = require('./api.js')
const hook = require('./hook.js')
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

function dump(data, msg) {
  console.log(`--- ${ msg || 'dump' } ---`)
  console.log(JSON.stringify(data, ' ', 2))
}

// body parser middleware
let urlEncodedBodyParser = bodyParser.urlencoded({ extended: false })
let jsonBodyParser       = bodyParser.json()
let rawBodyParser        = bodyParser.raw({ type : "*/*" })

// RateLimit some endpoints, such as app.post('/sign-in')
const signInLimiter = new RateLimit({
  windowMs   : 5 * 60 * 1000,   // 5 mins
  max        : 5,               // only allow 5 attempts
  delayAfter : 1,               // begin slowing down responses after the first request
  delayMs    : 1 * 1000,        // slow down subsequent responses by an additional second each request
  message    : "Too many requests, please try again in 5 minutes.\n"
})

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
app.use(urlEncodedBodyParser)
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
  '/sign-out/' : '/sign-out',
  '/sign-in/'  : '/sign-in',
  '/admin'     : '/admin/',
}))
app.use(middleware.loadSettings)
app.use(middleware.loadMenu)
app.use(middleware.checkConfig)

// --- routes ---

app.get(
  '/',
  middleware.loadGifts,
  stripeMiddleware.loadPlans,
  (req, res) => {
    console.log('%s : /', req._.rid)

    // get the markdown from the database
    api.getPage(null, 'index', (err, page) => {
      if (err) {
        // we might have an error with the database, but we can still show the index page
        console.warn(err)
      }

      res.render('index', {
        toptab : 'index',
        page   : page,
      })
    })
  }
)

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(publicDir, 'robots.txt'))
})

// healthz
app.get('/healthz', (req, res, next) => {
  api.getTimestamp(null, (err, ts) => {
    if (err) return next(err)

    res.render('healthz', {
      ts : ts,
    })
  })
})

// check the `/thanks` page before landing on the generic `/:name` route
app.get('/thanks', (req, res, next) => {
  api.getPage(null, 'thanks', (err, page) => {
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
      console.warn(err)
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
    api.insDonation(null, donation, (err, res) => {
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

// Subscribe
app.post('/subscribe', (req, res, next) => {
  console.log('%s : /subscribe', req._.rid)

  // We need to do three things:
  //
  // 1. Send the `stripeToken` back to Stripe to actually charge the card.
  // 2. Send a thank you email to the user.
  // 3. Render the "Thank You" page for the user to see payment was successful.

  // validate a few of the things we've been given
  const token_id  = req.body.token_id
  const email     = req.body.email
  const plan      = req.body.plan

  // Check this plain against our list from Stripe ... though we don't have to, since `stripe.subscriptions.create()`
  // will fail if it doesn't exist.

  // From : https://stripe.com/docs/recipes/subscription-signup
  //
  // Steps are:
  // 1. Create a Customer
  // 2. Add Customer to Plan to Create a Subscription
  const newCustomer = {
    email       : email,
    source      : token_id,
    description : 'Customer ' + email + ' for subscription to ' + plan,
  }
  stripe.customers.create(newCustomer, (err, customer) => {
    if (err) {
      // ToDo: if we had an error, we should store the error somewhere so we can see it - let's say the 'event' table.
      console.warn(err)
      return next(err)
    }

    // now create the subscription
    const newSubscription = {
      customer : customer.id,
      items : [
        { plan : plan },
      ],
    }
    stripe.subscriptions.create(newSubscription, (err, subscription) => {
      if (err) {
        // ToDo: if we had an error, we should store the error somewhere so we can see it - let's say the 'event' table.
        console.warn(err)
        return next(err)
      }

      res.redirect(302, '/thanks?plan=' + plan)
    })
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
app.post('/sign-in', middleware.ensureNoUser, signInLimiter, (req, res) => {
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

// --- Admin ---

app.use('/admin', middleware.ensureUser, middleware.setTitle('Admin'))

app.get('/admin/', (req, res) => {
  res.render('admin-index')
})

app.get('/admin/settings', (req, res, next) => {
  // get all the current settings
  api.selSettings(null, (err, current) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

    res.render('admin-settings', {
      cfg     : settings.items,
      current : current,
      form    : {},
      errors  : {},
    })
  })
})

app.get('/admin/donations', (req, res, next) => {
  // get all the subscriptions
  const query = {
    limit : 100,
  }
  stripe.charges.list(query, (err, charges) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

    // get all the donations
    api.selDonationsAll(null, (err, donations) => {
      if (err) {
        console.warn(err)
        return next(err)
      }

      res.render('admin-donations', {
        donations     : donations,
        charges       : charges.data,
        has_more      : charges.has_more,
      })
    })
  })
})

app.get('/admin/subscriptions', (req, res, next) => {
  // get all the subscriptions
  const query = {
    limit : 100,
  }
  stripe.subscriptions.list(query, (err, subscriptions) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

    // dump(subscriptions, 'subscriptions')

    res.render('admin-subscriptions', {
      subscriptions : subscriptions.data,
      has_more      : subscriptions.has_more,
    })
  })
})

app.get('/admin/reports', (req, res, next) => {
  res.render('admin-reports')
})

app.get('/admin/report/customers', (req, res, next) => {
  const query = {
    limit : 100,
  }
  stripe.customers.list(query, (err, customers) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

    // Note: since we only ever send a one Subscription Item in `stripe.subscription.create()`
    // then Stripe gives us a quick way to see the plan directly on the top-level subscription
    // for each customer, instead of us having to delve down into the subscription items.
    //
    // See : https://stripe.com/docs/subscriptions/multiplan

    // dump(customers, 'customers')

    res.render('admin-report-customers', {
      customers : customers.data || [],
    })
  })
})

// --- Admin : Pages ---

app.get('/admin/pages', (req, res, next) => {
  // get all the pages
  api.selPagesAll(null, (err, pages) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

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
  api.insPage(null, data, (err) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

    // call the reloadMenu middleware explicitly
    middleware.reloadMenu(req, res, (err) => {
      if (err) return next(err)

      // all good
      res.redirect('/admin/pages')
    })
  })
})

app.get('/admin/page/:name', (req, res, next) => {
  // get the page
  const name = req.params.name
  if ( name === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this page
  api.getPage(null, name, (err, page) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

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
  api.getPage(null, name, (err, page) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

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
  api.getPage(null, name, (err, page) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

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

    // update the page and redirect to pages
    api.updPage(null, data, (err) => {
      if (err) {
        console.warn(err)
        return next(err)
      }

      // call the reloadMenu middleware explicitly
      middleware.reloadMenu(req, res, (err) => {
        if (err) return next(err)

        // all good
        res.redirect('/admin/pages')
      })
    })
  })
})

// --- Admin : Gifts ---

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
  api.insGift(null, data, (err) => {
    if (err) return next(err)

    // all good
    res.redirect('/admin/gifts')
  })
})

app.get('/admin/gift/:id', (req, res, next) => {
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this gift
  api.getGift(null, id, (err, gift) => {
    if (err) return next(err)

    if ( !gift ) {
      return res.status(404).send("404 - Not Found")
    }

    res.render('admin-gift-:id', {
      gift : gift,
    })
  })
})

app.get('/admin/gift/:id/edit', (req, res, next) => {
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this gift
  api.getGift(null, id, (err, gift) => {
    if (err) return next(err)

    if ( !gift ) {
      return res.status(404).send("404 - Not Found")
    }

    // now get all the intervals
    res.render('admin-gift-form', {
      gift      : gift,
      form      : {}, // no inputs yet!
      errors    : {}, // no errors yet!
    })
  })
})

app.post('/admin/gift/:id/edit', (req, res, next) => {
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get the gift
  let form = req.body
  const { errs, data } = validate.gift.edit(form)

  // firstly, check that this id currently exist in the database
  api.getGift(null, id, (err, gift) => {
    if (err) return next(err)

    if ( !gift ) {
      return res.status(404).send("404 - Not Found")
    }

    // If there were errors with validation, re-render the form (had to wait until now so that we could pass the
    // original 'gift' (from the database) to the template as well as the current form.
    if ( errs ) {
      return res.render('admin-gift-form', {
        gift   : gift,
        form   : form,
        errors : errs,
      })
    }

    // update the gift and redirect to gifts
    api.updGift(null, gift.id, data, (err) => {
      if (err) {
        console.warn(err)
        return next(err)
      }

      res.redirect('/admin/gifts')
    })
  })
})

app.get('/admin/gift/:id/delete', (req, res, next) => {
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this gift
  api.getGift(null, id, (err, gift) => {
    if (err) return next(err)

    if ( !gift ) {
      return res.status(404).send("404 - Not Found")
    }

    // now get all the intervals
    res.render('admin-gift-:id-delete', {
      gift : gift,
    })
  })
})

app.post('/admin/gift/:id/delete', (req, res, next) => {
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this gift
  api.getGift(null, id, (err, gift) => {
    if (err) return next(err)

    if ( !gift ) {
      return res.status(404).send("404 - Not Found")
    }

    // delete this gift
    api.delGift(null, id, (err) => {
      if (err) return next(err)
      res.redirect('/admin/gifts?msg=gift-deleted')
    })
  })
})

// --- Admin : Plans ---

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

  // before adding to our database, firstly add it to Stripe
  const stripePlan = {
    id                   : data.id,
    name                 : data.name,
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
    if (err) {
      console.warn(err)
      return next(err)
    }

    // all good
    res.redirect('/admin/plans')
  })
})

app.get('/admin/plan/:id', (req, res, next) => {
  // get the plan
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get the plan from Stripe
  stripe.plans.retrieve(id, (err, plan) => {
    if (err) return next(err)

    if ( !plan ) {
      return res.status(404).send("404 - Not Found")
    }

    res.render('admin-plan-:id', {
      plan : plan,
    })
  })
})

app.get('/admin/plan/:id/edit', (req, res, next) => {
  // get the plan
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  console.log('id=' + id)

  // firstly, get the plan from Stripe and 404 if not found
  stripe.plans.retrieve(id, (err, plan) => {
    if (err) return next(err)

    console.log('stripe.plans.retrieve:', plan)

    if ( !plan ) {
      return res.status(404).send("404 - Not Found")
    }

    // now get all the intervals
    res.render('admin-plan-form', {
      plan      : plan,
      form      : {}, // no inputs yet!
      errors    : {}, // no errors yet!
      intervals : valid.intervals,
    })
  })
})

app.post('/admin/plan/:id/edit', (req, res, next) => {
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get the gift
  let form = req.body
  const { errs, data } = validate.plan.edit(form)

  // firstly, get the plan from Stripe and 404 if not found
  stripe.plans.retrieve(id, (err, plan) => {
    if (err) return next(err)

    console.log('stripe.plans.retrieve:', plan)

    if ( !plan ) {
      return res.status(404).send("404 - Not Found")
    }

    // If there were errors with validation, re-render the form (had to wait until now so that we could pass the
    // original 'gift' (from the database) to the template as well as the current form.
    if ( errs ) {
      return res.render('admin-plan-form', {
        plan   : plan,
        form   : form,
        errors : errs,
      })
    }

    // update the plan and redirect to /admin/plans
    let newPlan = {
      name                 : data.name,
      metadata             : {
        active      : 'yes',
        description : data.description,
      },
      statement_descriptor : data.statement
    }
    stripe.plans.update(id, newPlan, (err, plan) => {
      // asynchronously called
      console.log('stripe.plans.update - err:', err)
      console.log('stripe.plans.update - plan:', plan)
      if (err) {
        console.warn(err)
        return next(err)
      }

      res.redirect('/admin/plans')
    })
  })
})

// --- Admin : Events ---

app.get(
  '/admin/events',
  (req, res, next) => {
    api.selEventsAll(null, (err, events) => {
      if (err) {
        console.warn(err)
        return next(err)
      }

      res.render('admin-events', {
        events : events,
      })
    })
  }
)

app.get( '/admin/event/:id', (req, res, next) => {
  const id = req.params.id
  if ( id === '' ) {
    return res.status(404).send("404 - Not Found")
  }

  // get just this event
  api.getEvent(null, id, (err, event) => {
    if (err) return next(err)

    if ( !event ) {
      return res.status(404).send("404 - Not Found")
    }

    res.render('admin-event-:id', {
      event : event,
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
    api.selSettings(null, (err, current) => {
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

// WebHooks
app.post('/hook/stripe', rawBodyParser, stripeMiddleware.webhook, (req, res, next) => {
  // everything checked okay - we can find the event on `req._event`
  let event = req._event

  console.log('/hook/stripe - event.id=' + event.id + ', type=' + event.type)

  // process this event
  hook.processStripeHook(null, event, (err) => {
    if (err) return next(err)

    // all good!
    res.json({ ok : true })
  })
})

// --- Pages ---

// generic pages
app.get('/:name', (req, res, next) => {
  api.getPage(null, req.params.name, (err, page) => {
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
