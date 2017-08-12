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
const JoiStatement   = Joi.string().min(1).max(22).uppercase().regex(/^[A-Z0-9\ ]+$/).required()

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
  const schema = Joi.object().keys({
    id          : JoiName,
    name        : JoiTitle,
    description : JoiDescription,
    amount      : JoiAmount,
    statement   : JoiStatement,
  })

  return check(form, schema)
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
