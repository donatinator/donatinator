// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const validatejs = require('validate.js') // https://validatejs.org/

// --------------------------------------------------------------------------------------------------------------------

const types = {

  // normalise just gives easier access to some simple normalisation routines
  normalise : {
    trim(v) {
      return v.trim()
    },
    currency(v) {
      // the `charge` api returns this in lowercase, so let's do the same
      return v.trim().toLowerCase()
    },
  },

  // validify the raw input
  validify : {
    string(v) {
      return true
    },
    integer(v) {
      return !!v.trim().match(/^[+-]?\d+$/)
    },
    url(v) {
      return validatejs({ url : v }, { url : { url : true }})
    },
    secureUrl(v) {
      return validatejs(
        { url : v },
        { url : { schemes : [ "https" ] } }
      )
    },
    currency(v) {
      // should be three lowercase letters
      return !!v.match(/^[a-z]{3}$/)
    },
  },

}

const items = {

  // the title is shown on the front page and used in the <title> tags on each page
  title : {
    title     : 'Title',
    type      : 'string',
    desc      : 'The main title of the site used on the front page and various other places.',
    help      : [
      'The name of your charity or non-profit so your donators',
      'can be sure they are in the right place. e.g. Fresh Water for All.',
    ].join(' '),
    error     : 'Enter a title for your organisation.',
    default   : 'Site Title',
    normalise : types.normalise.trim,
    validify  : types.validify.string,
    required  : true,
  },

  // the lead is used on the front page directly below the main title
  lead : {
    title     : 'Site Lead / Description',
    type      : 'string',
    desc      : 'The main lead/description of your charity. Used on the front page and in the meta description tags of each page.',
    help      : [
      'A short (2-3 sentences) description of your charity or non-profit,',
      'or how you would use any donations.',
    ].join(' '),
    // no error since it'll never error out
    // no default since it is not required
    normalise : types.normalise.trim,
    validify  : types.validify.string,
    required  : false,
  },

  // the splash image shows at the top of the front page
  splashImage : {
    title     : 'Splash Image',
    type      : 'url',
    desc      : 'The URL of the image shown on the front page.',
    help      : [
      'We recommend using an image hosting service such as',
      '<a href="https://postimages.org/">postimg.org</a>',
      'or',
      '<a href="https://imgur.com/">imgur.com</a>.',
    ].join(' '),
    error     : 'Needs to be a valid URL. e.g. https://example.com/path/to/image.jpg',
    // no 'default' since this setting is optional
    normalise : types.normalise.trim,
    validify  : types.validify.secureUrl,
    required  : false,
  },

  // currency is what to accept donations in
  currency : {
    title     : 'Currency',
    type      : 'string', // how do we validate this is correct?
    desc      : 'The three letter code of the currency you wish to accept.',
    help      : [
      'This <strong>must</strong> be a valid code that Stripe accepts.',
      'e.g. three letters such as',
      '<code>usd</code>, <code>gbp</code>, or <code>nzd</code>.',
      'See <a href="https://stripe.com/docs/currencies">https://stripe.com/docs/currencies</a>.',
    ].join(' '),
    error     : 'Invalid currency, must be three letters.',
    default   : 'e.g. USD',
    normalise : types.normalise.currency,
    validify  : types.validify.currency,
    required  : true,
  },

  // ToDo: an 'integer' type (when we know of one) so we can test it's conversion/validation

}

// returns an object containing key/msg of all the invalid values
function normalise(form) {
  console.log('normalise() - form:', form)

  var val = {}

  // loop through all setting items
  Object.keys(items).forEach(name => {
    // normalise this particular value (or the empty string if not in the form)
    val[name] = items[name].normalise(form[name] || '')
  })

  return val
}

// returns an object containing key/msg of all the invalid values
function validate(form) {
  console.log('validate() - form:', form)

  var errors = {}

  // loop through all setting items
  Object.keys(items).forEach(name => {
    const setting = items[name]

    // check if the value is the empty string
    if ( form[name] === '' ) {
      // do we allow an empty string
      if ( !setting.required ) {
        // yes, we allow empty - so continue to next setting
        return
      }

      // no, we don't allow an empty setting
      errors[name] = setting.error
      return
    }

    // validate this setting
    if ( !setting.validify(form[name]) ) {
      errors[name] = setting.error
    }

    // this setting is valid - nothing more to do
  })

  // return null if there were no errors
  return Object.keys(errors).length ? errors : null
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  items,
  normalise,
  validate,
}

// --------------------------------------------------------------------------------------------------------------------
