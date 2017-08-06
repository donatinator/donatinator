// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const Joi = require('joi')

// --------------------------------------------------------------------------------------------------------------------
// some of our own validation rules

const JoiName    = Joi.string().regex(/^[a-z0-9][a-z0-9-]+[a-z0-9]$/)
const JoiTitle   = Joi.string().required()
const JoiContent = Joi.string().allow('')

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

  return { errs : errs, data : result.value }
}

// --- Plans ---

function planEdit(form) {

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
  plan : {
    // new  : planNew,
    edit : planEdit,
  },
  page : {
    new  : pageNew,
    edit : pageEdit,
  },
}

// --------------------------------------------------------------------------------------------------------------------
