// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const Joi = require('joi')

// --------------------------------------------------------------------------------------------------------------------
// some of our own validation rules

// See : https://github.com/hapijs/joi/blob/v10.6.0/API.md

const JoiName        = Joi.string().regex(/^[a-z0-9][a-z0-9-]+[a-z0-9]$/)
const JoiTitle       = Joi.string().required()
const JoiDescription = Joi.string().allow('')
const JoiContent     = JoiDescription
const JoiAmount      = Joi.number().integer().min(500).required()
const JoiCurrency    = Joi.string().lowercase().regex(/^[a-z]{3}$/)
const JoiInterval    = Joi.string().valid('none', 'day', 'week', 'month', 'year').required()
const JoiStatement   = Joi.string().min(1).max(22).regex(/^[A-Z0-9\ ]+$/).required()

// --------------------------------------------------------------------------------------------------------------------

function check(form, schema) {
  const result = Joi.validate(form, schema, { abortEarly : false })
  console.log('result:', result)

  // if there are errors, convert the crappy error array into a nice object
  let errs = null
  if ( result.error ) {
    errs = {}
    result.error.details.forEach(e => {
      errs[e.path] = e.message
    })
    // and add the general error in
    errs.msg = '' + result.error
  }

  console.log('errs:', errs)
  return { errs : errs, data : result.value }
}

// --- Gifts ---

function giftNew(form) {
  const schema = Joi.object().keys({
    id          : JoiName,
    name        : JoiTitle,
    description : JoiDescription,
    amount      : JoiAmount,
    statement   : JoiStatement,
  })

  return check(form, schema)
}

function giftEdit(form) {
  // ToDo: ... !!!
}

// --- Plans ---

function planNew(form) {
  const schema = Joi.object().keys({
    name        : JoiName,
    title       : JoiTitle,
    description : JoiDescription,
    amount      : JoiAmount,
    interval    : JoiInterval,
    statement   : JoiStatement,
  })

  return check(form, schema)
}

function planEdit(form) {
  // ToDo: ... !!!
}

// --- Pages ---

function pageNew(form) {
  const schema = Joi.object().keys({
    name    : JoiName,
    title   : JoiTitle,
    content : JoiContent,
  })

  return check(form, schema)
}

function pageEdit(form) {
  const schema = Joi.object().keys({
    name    : JoiName,
    title   : JoiTitle,
    content : JoiContent,
  })

  return check(form, schema)
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  gift : {
    new  : giftNew,
    edit : giftEdit,
  },
  plan : {
    new  : planNew,
    edit : planEdit,
  },
  page : {
    new  : pageNew,
    edit : pageEdit,
  },
}

// --------------------------------------------------------------------------------------------------------------------
