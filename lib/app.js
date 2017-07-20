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

// local
const middleware = require('./middleware.js')

// --------------------------------------------------------------------------------------------------------------------
// setup

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
  title   : process.env.TITLE    || 'Your Name Here',
  min     : isProd ? ".min" : "",
  apex    : process.env.APEX     || 'example.com',
  baseUrl : process.env.BASE_URL || 'http://example.com',
}

// npm middleware for all routes
app.use(canonicalHost(process.env.APEX))
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

app.get('/', (req, res) => {
  console.log('req.headers.host:', req.headers.host)

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

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handler
app.use(function(err, req, res, next) {
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
